import OpenAI from 'openai';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

interface SOPTemplate {
  title: string;
  sections: string[];
  format: string;
}

export class SOPService {
  private readonly openai: OpenAI;
  private readonly templates: SOPTemplate[];

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Define SOP templates
    this.templates = [
      {
        title: 'Standard Operating Procedure',
        sections: [
          'Purpose',
          'Scope',
          'Responsibilities',
          'Procedure',
          'Safety Considerations',
          'Quality Control',
          'References'
        ],
        format: 'markdown'
      },
      {
        title: 'Quick Reference Guide',
        sections: [
          'Overview',
          'Steps',
          'Tips',
          'Troubleshooting'
        ],
        format: 'markdown'
      }
    ];
  }

  async generateSOP(transcription: string, templateIndex: number = 0): Promise<string> {
    try {
      const template = this.templates[templateIndex];
      
      // Create the prompt for GPT-4
      const prompt = this.createPrompt(transcription, template);
      
      // Generate SOP using GPT-4
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert at creating clear, concise, and well-structured Standard Operating Procedures (SOPs)."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const sop = completion.choices[0].message.content;
      if (!sop) {
        throw new Error('Failed to generate SOP');
      }

      return sop;
    } catch (error) {
      logger.error('SOP generation failed:', error);
      throw new AppError('Failed to generate SOP', 500);
    }
  }

  private createPrompt(transcription: string, template: SOPTemplate): string {
    return `
Please create a ${template.title} based on the following video transcription.
Use the following sections: ${template.sections.join(', ')}.
Format the output in ${template.format}.

Transcription:
${transcription}

Requirements:
1. Be clear and concise
2. Use bullet points where appropriate
3. Include specific steps and measurements
4. Add safety warnings where necessary
5. Include quality check points
6. Format in ${template.format}
`;
  }

  async validateSOP(sop: string, templateIndex: number = 0): Promise<boolean> {
    // Basic validation to ensure SOP is not empty and has reasonable length
    if (!sop || sop.trim().length === 0) {
      return false;
    }
    
    // Check if SOP has reasonable length (e.g., at least 100 characters)
    if (sop.length < 100) {
      return false;
    }
    
    // Use the correct template for validation
    const template = this.templates[templateIndex];
    const hasRequiredSections = template.sections.every(section => 
      sop.toLowerCase().includes(section.toLowerCase())
    );
    
    if (!hasRequiredSections) {
      return false;
    }
    
    return true;
  }

  getAvailableTemplates(): SOPTemplate[] {
    return this.templates;
  }

  async exportSOPToPDF(jobId: string, sopHtml: string): Promise<string> {
    const exportsDir = path.join(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'), 'exports');
    await fs.mkdir(exportsDir, { recursive: true });
    const pdfPath = path.join(exportsDir, `${jobId}.pdf`);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(sopHtml, { waitUntil: 'networkidle0' });
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
    await browser.close();
    return pdfPath;
  }
} 