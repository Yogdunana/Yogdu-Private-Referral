'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import type { JobFormData, AiParseResult } from '@/types';
import type { JobType, WorkMode } from '@prisma/client';

interface JobFormProps {
  initialData?: Partial<JobFormData> & { id?: string };
  onSubmit: (data: JobFormData) => Promise<void>;
  mode: 'create' | 'edit';
}

const JOB_TYPE_OPTIONS: { value: JobType; label: string }[] = [
  { value: 'DAILY_INTERNSHIP', label: '日常实习' },
  { value: 'SUMMER_INTERNSHIP', label: '暑期实习' },
  { value: 'RESEARCH_INTERNSHIP', label: '科研实习' },
  { value: 'FULL_TIME', label: '全职' },
  { value: 'OTHER', label: '其他' },
];

const WORK_MODE_OPTIONS: { value: WorkMode; label: string }[] = [
  { value: 'REMOTE', label: '远程' },
  { value: 'ONSITE', label: '线下' },
  { value: 'HYBRID', label: '混合' },
];

const emptyFormData: JobFormData = {
  title: '',
  type: 'DAILY_INTERNSHIP',
  location: '',
  content: '',
  requirements: '',
  researchField: '',
  businessTrack: '',
  bonusPoints: '',
  workMode: 'ONSITE',
  contactEmail: '',
  emailFormat: '',
  deadline: '',
  tags: [],
};

export default function JobForm({ initialData, onSubmit, mode }: JobFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<JobFormData>({
    ...emptyFormData,
    ...initialData,
  });
  const [pasteText, setPasteText] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [activeTab, setActiveTab] = useState('paste');
  const [errors, setErrors] = useState<Partial<Record<keyof JobFormData, string>>>({});

  // Load edit data if edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
      }));
    }
  }, [mode, initialData]);

  const updateField = <K extends keyof JobFormData>(key: K, value: JobFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      updateField('tags', [...formData.tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    updateField(
      'tags',
      formData.tags.filter((t) => t !== tag)
    );
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof JobFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = '请输入职位标题';
    }
    if (!formData.location.trim()) {
      newErrors.location = '请输入工作地点';
    }
    if (!formData.content.trim()) {
      newErrors.content = '请输入工作内容';
    }
    if (!formData.requirements.trim()) {
      newErrors.requirements = '请输入岗位要求';
    }
    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = '请输入联系邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = '请输入有效的邮箱地址';
    }
    if (!formData.deadline) {
      newErrors.deadline = '请选择截止日期';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('请填写必填项');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      toast.success(mode === 'create' ? '投稿成功，等待审核' : '修改成功');
      router.push('/my-submissions');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiParse = async () => {
    if (!pasteText.trim()) {
      toast.error('请先粘贴职位文案');
      return;
    }

    setIsParsing(true);
    try {
      const res = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        const parsed: AiParseResult = json.data;
        setFormData((prev) => ({
          ...prev,
          title: parsed.title || prev.title,
          type: (parsed.type as JobType) || prev.type,
          location: parsed.location || prev.location,
          content: parsed.content || prev.content,
          requirements: parsed.requirements || prev.requirements,
          researchField: parsed.researchField || prev.researchField,
          businessTrack: parsed.businessTrack || prev.businessTrack,
          bonusPoints: parsed.bonusPoints || prev.bonusPoints,
          workMode: (parsed.workMode as WorkMode) || prev.workMode,
          contactEmail: parsed.contactEmail || prev.contactEmail,
          emailFormat: parsed.emailFormat || prev.emailFormat,
          deadline: parsed.deadline || prev.deadline,
          tags: parsed.tags || prev.tags,
        }));
        toast.success('AI 解析完成');
        setActiveTab('form');
      } else {
        toast.error(json.error || 'AI 解析失败');
      }
    } catch {
      toast.error('AI 解析失败，请重试');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="paste">粘贴文案</TabsTrigger>
          <TabsTrigger value="form">手动填写</TabsTrigger>
        </TabsList>

        <TabsContent value="paste" className="space-y-4">
          <div className="space-y-2">
            <Label>粘贴职位信息</Label>
            <Textarea
              placeholder="将招聘信息粘贴到这里，AI 将自动解析并填充表单..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="min-h-[300px]"
            />
          </div>
          <Button
            type="button"
            onClick={handleAiParse}
            disabled={isParsing || !pasteText.trim()}
            className="gap-2"
          >
            {isParsing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {isParsing ? '正在解析...' : 'AI 智能解析'}
          </Button>
        </TabsContent>

        <TabsContent value="form" className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              职位标题 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="例如：字节跳动 - 后端开发实习生"
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Type & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">
                职位类型 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.type}
                onValueChange={(val) => updateField('type', val as JobType)}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">
                工作地点 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="例如：北京"
              />
              {errors.location && (
                <p className="text-xs text-destructive">{errors.location}</p>
              )}
            </div>
          </div>

          {/* Work Mode */}
          <div className="space-y-2">
            <Label htmlFor="workMode">工作方式</Label>
            <Select
              value={formData.workMode}
              onValueChange={(val) => updateField('workMode', val as WorkMode)}
            >
              <SelectTrigger id="workMode" className="w-full sm:w-[200px]">
                <SelectValue placeholder="选择工作方式" />
              </SelectTrigger>
              <SelectContent>
                {WORK_MODE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">
              工作内容 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => updateField('content', e.target.value)}
              placeholder="请描述工作内容..."
              className="min-h-[120px]"
            />
            {errors.content && (
              <p className="text-xs text-destructive">{errors.content}</p>
            )}
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <Label htmlFor="requirements">
              岗位要求 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="requirements"
              value={formData.requirements}
              onChange={(e) => updateField('requirements', e.target.value)}
              placeholder="请描述岗位要求..."
              className="min-h-[100px]"
            />
            {errors.requirements && (
              <p className="text-xs text-destructive">{errors.requirements}</p>
            )}
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="researchField">研究方向</Label>
              <Input
                id="researchField"
                value={formData.researchField || ''}
                onChange={(e) => updateField('researchField', e.target.value)}
                placeholder="可选"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessTrack">业务方向</Label>
              <Input
                id="businessTrack"
                value={formData.businessTrack || ''}
                onChange={(e) => updateField('businessTrack', e.target.value)}
                placeholder="可选"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonusPoints">加分项</Label>
              <Input
                id="bonusPoints"
                value={formData.bonusPoints || ''}
                onChange={(e) => updateField('bonusPoints', e.target.value)}
                placeholder="可选"
              />
            </div>
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="contactEmail">
              联系邮箱 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => updateField('contactEmail', e.target.value)}
              placeholder="hr@example.com"
            />
            {errors.contactEmail && (
              <p className="text-xs text-destructive">{errors.contactEmail}</p>
            )}
          </div>

          {/* Email Format */}
          <div className="space-y-2">
            <Label htmlFor="emailFormat">邮件格式</Label>
            <Textarea
              id="emailFormat"
              value={formData.emailFormat}
              onChange={(e) => updateField('emailFormat', e.target.value)}
              placeholder="例如：姓名-学校-专业-应聘岗位-可实习时长"
              className="min-h-[60px]"
            />
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label htmlFor="deadline">
              截止日期 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="deadline"
              type="date"
              value={formData.deadline}
              onChange={(e) => updateField('deadline', e.target.value)}
            />
            {errors.deadline && (
              <p className="text-xs text-destructive">{errors.deadline}</p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>标签</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="输入标签后按回车添加"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Submit button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} className="gap-2 min-w-[120px]">
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              提交中...
            </>
          ) : mode === 'create' ? (
            '提交投稿'
          ) : (
            '保存修改'
          )}
        </Button>
      </div>
    </form>
  );
}
