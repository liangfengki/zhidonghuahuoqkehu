import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.module';


@Injectable()
export class TemplatesService {
  private renderer = {
    extractVariables: (text: string) => {
      const matches = text.matchAll(/\{\{(\w+)\}\}/g);
      return Array.from(new Set(Array.from(matches).map(m => m[1])));
    },
    renderWithDefaults: (subject: string, body: string, contact: any) => {
      const vars: Record<string, string> = {
        firstName: contact.firstName, lastName: contact.lastName,
        fullName: contact.firstName + ' ' + contact.lastName,
        email: contact.email, companyName: contact.companyName,
        position: contact.position || '采购经理',
      };
      const render = (t: string) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || '{{' + k + '}}');
      return { subject: render(subject), body: render(body) };
    },
  };
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.emailTemplate.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async create(tenantId: string, dto: { name: string; subject: string; body: string; language?: string }) {
    const variables = this.renderer.extractVariables(dto.subject + ' ' + dto.body);
    return this.prisma.emailTemplate.create({
      data: { tenantId, name: dto.name, subject: dto.subject, body: dto.body, language: dto.language || 'zh', variables },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<{ name: string; subject: string; body: string }>) {
    const template = await this.prisma.emailTemplate.findFirst({ where: { id, tenantId } });
    if (!template) throw new NotFoundException('模板不存在');
    const variables = this.renderer.extractVariables((dto.subject || template.subject) + ' ' + (dto.body || template.body));
    return this.prisma.emailTemplate.update({ where: { id }, data: { ...dto, variables } });
  }

  async preview(tenantId: string, id: string) {
    const template = await this.prisma.emailTemplate.findFirst({ where: { id, tenantId } });
    if (!template) throw new NotFoundException('模板不存在');

    const sampleVars = {
      firstName: '张', lastName: '三', fullName: '张三', email: 'zhangsan@example.com',
      companyName: 'ABC Technology Inc.', position: '采购经理',
    };
    const rendered = this.renderer.renderWithDefaults(template.subject, template.body, sampleVars);
    return { original: template, rendered };
  }
}
