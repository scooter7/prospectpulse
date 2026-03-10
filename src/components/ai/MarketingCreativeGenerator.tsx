'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, MessageSquare, Sparkles, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  businessName: string;
  campaignName: string;
}

export function MarketingCreativeGenerator({ businessName, campaignName }: Props) {
  const [type, setType] = useState<'email' | 'sms'>('email');
  const [tone, setTone] = useState('professional and friendly');
  const [details, setDetails] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, businessName, campaignName, tone, details }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setGeneratedContent(data.content);
      }
    } catch {
      toast.error('Failed to generate content');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI Marketing Creative
        </CardTitle>
        <CardDescription>
          Generate personalized outreach content using GPT-4o-mini
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={type} onValueChange={(v) => setType(v as 'email' | 'sms')}>
          <TabsList className="mb-4">
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" /> Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-2">
              <MessageSquare className="h-4 w-4" /> SMS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v ?? "")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional and friendly">Professional & Friendly</SelectItem>
                  <SelectItem value="formal and authoritative">Formal & Authoritative</SelectItem>
                  <SelectItem value="casual and conversational">Casual & Conversational</SelectItem>
                  <SelectItem value="urgent and action-oriented">Urgent & Action-Oriented</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Additional Context (optional)</Label>
              <Input
                placeholder="e.g., They showed interest in our digital ads package"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v ?? "")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional and friendly">Professional & Friendly</SelectItem>
                  <SelectItem value="casual and brief">Casual & Brief</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Additional Context (optional)</Label>
              <Input
                placeholder="e.g., Follow up on last week's call"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="mt-4 w-full"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {loading ? 'Generating...' : `Generate ${type === 'email' ? 'Email' : 'SMS'}`}
        </Button>

        {generatedContent && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label>Generated Content</Label>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Textarea
              value={generatedContent}
              onChange={(e) => setGeneratedContent(e.target.value)}
              rows={type === 'email' ? 10 : 3}
              className="font-mono text-sm"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
