const VARIABLE_REGEX = /\{\{(\w+)\}\}/g;

export class TemplateRenderer {
  render(template: string, variables: Record<string, string>): string {
    return template.replace(VARIABLE_REGEX, (_, key) => {
      return variables[key] ?? `{{${key}}}`;
    });
  }

  extractVariables(template: string): string[] {
    const matches = template.matchAll(VARIABLE_REGEX);
    const vars = new Set<string>();
    for (const m of matches) {
      vars.add(m[1]);
    }
    return Array.from(vars);
  }

  renderWithDefaults(subject: string, body: string, contact: {
    firstName: string;
    lastName: string;
    email: string;
    companyName: string;
    position?: string;
  }): { subject: string; body: string } {
    const vars: Record<string, string> = {
      firstName: contact.firstName,
      lastName: contact.lastName,
      fullName: `${contact.firstName} ${contact.lastName}`,
      email: contact.email,
      companyName: contact.companyName,
      position: contact.position || '采购经理',
    };

    return {
      subject: this.render(subject, vars),
      body: this.render(body, vars),
    };
  }
}
