import crypto from 'crypto';
import { config } from '../config/env';
import { logger } from './logger';

// Optional OpenAI dependency
let OpenAI: any = null;
try {
  if (config.openaiApiKey) {
    OpenAI = require('openai').OpenAI;
  }
} catch (error) {
  logger.warn('openai package not installed or failed to load. AI will use regex fallback.');
}

/**
 * AI Agreement Intelligence
 */
export interface AIAgreementAnalysis {
  tenantName: string;
  ownerName: string;
  propertyAddress: string;
  rentalStartDate: string;
  rentalEndDate: string;
  rentAmount: string;
  depositAmount: string;
  noticePeriod: string;
  lockinPeriod: string;
  maintenanceClause: string;
  houseRules: string[];
  renewalDate: string;
  expiryDate: string;
  importantClauses: string[];
  summary: string;
  missingFields: string[];
  risksOrInconsistencies: string[];
}

export const analyzeAgreementText = async (text: string): Promise<AIAgreementAnalysis> => {
  if (OpenAI && config.openaiApiKey) {
    try {
      const openai = new OpenAI({ apiKey: config.openaiApiKey });
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant specializing in rental agreement analysis. Analyze the agreement text and return a JSON object matches the requested schema. Ensure all fields are extracted accurately.'
          },
          {
            role: 'user',
            content: `Analyze the following rental agreement text and extract these fields:
            tenantName, ownerName, propertyAddress, rentalStartDate, rentalEndDate, rentAmount, depositAmount, noticePeriod, lockinPeriod, maintenanceClause, houseRules (array), renewalDate, expiryDate, importantClauses (array of string highlights), summary, missingFields (array of important missing items), risksOrInconsistencies (array).
            
            Return ONLY the valid JSON output.
            
            Text:
            ${text}`
          }
        ],
        response_format: { type: 'json_object' }
      });
      
      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result as AIAgreementAnalysis;
    } catch (error) {
      logger.error('OpenAI Agreement analysis failed. Using fallback:', error);
    }
  }

  // Fallback pattern-matching / Regex
  const getValue = (regex: RegExp, text: string): string => {
    const match = text.match(regex);
    return match ? match[1].trim() : 'Not Found';
  };

  const tenantName = getValue(/(?:Tenant|Lessee|Renter)\s*:\s*([^\n\r]+)/i, text);
  const ownerName = getValue(/(?:Landlord|Lessor|Owner)\s*:\s*([^\n\r]+)/i, text);
  const propertyAddress = getValue(/(?:Address|Premises|Property Address)\s*:\s*([^\n\r]+)/i, text);
  const rentalStartDate = getValue(/(?:Start Date|Commencement Date|Commencing On)\s*:\s*([^\n\r]+)/i, text);
  const rentalEndDate = getValue(/(?:End Date|Termination Date|Expiring On)\s*:\s*([^\n\r]+)/i, text);
  const rentAmount = getValue(/(?:Rent|Monthly Rent|Rent Amount)\s*:\s*(?:Rs\.?|USD|\$)?\s*([0-9,]+)/i, text);
  const depositAmount = getValue(/(?:Deposit|Security Deposit|Deposit Amount)\s*:\s*(?:Rs\.?|USD|\$)?\s*([0-9,]+)/i, text);
  const noticePeriod = getValue(/(?:Notice Period|Termination Notice)\s*:\s*([^\n\r]+)/i, text);
  const lockinPeriod = getValue(/(?:Lock-in Period|Minimum Stay)\s*:\s*([^\n\r]+)/i, text);
  const maintenanceClause = getValue(/(?:Maintenance|Repair Clause)\s*:\s*([^\n\r]+)/i, text);

  const missingFields: string[] = [];
  if (tenantName === 'Not Found') missingFields.push('Tenant Name');
  if (ownerName === 'Not Found') missingFields.push('Owner Name');
  if (propertyAddress === 'Not Found') missingFields.push('Property Address');
  if (rentalStartDate === 'Not Found') missingFields.push('Rental Start Date');
  if (rentalEndDate === 'Not Found') missingFields.push('Rental End Date');
  if (rentAmount === 'Not Found') missingFields.push('Rent Amount');

  return {
    tenantName,
    ownerName,
    propertyAddress,
    rentalStartDate,
    rentalEndDate,
    rentAmount,
    depositAmount,
    noticePeriod,
    lockinPeriod,
    maintenanceClause,
    houseRules: ['Standard behavior expected', 'No illegal activities'],
    renewalDate: rentalEndDate !== 'Not Found' ? `Before ${rentalEndDate}` : 'Not Found',
    expiryDate: rentalEndDate,
    importantClauses: [
      `Rent of ${rentAmount} to be paid monthly.`,
      `Security Deposit is ${depositAmount}.`
    ],
    summary: `Rental agreement between ${ownerName} (Landlord) and ${tenantName} (Tenant) for the property at ${propertyAddress}.`,
    missingFields,
    risksOrInconsistencies: missingFields.length > 0 ? [`Missing critical information: ${missingFields.join(', ')}`] : []
  };
};

/**
 * AI Document Intelligence
 */
export interface AIDocumentAnalysis {
  documentType: 'aadhaar' | 'pan' | 'driving_license' | 'passport' | 'student_id' | 'employment_proof' | 'other';
  confidence: number;
  extractedText: string;
  isReadable: boolean;
  isValid: boolean;
  metadataSummary: string;
  validationWarnings: string[];
}

export const detectFileSignature = (buffer: Buffer): { mimeType: string; extension: string } | null => {
  // Read magic numbers
  if (buffer.length < 4) return null;
  const hex = buffer.toString('hex', 0, 4).toUpperCase();
  
  if (hex.startsWith('89504E47')) return { mimeType: 'image/png', extension: '.png' };
  if (hex.startsWith('FFD8FF')) return { mimeType: 'image/jpeg', extension: '.jpg' };
  if (hex.startsWith('25504446')) return { mimeType: 'application/pdf', extension: '.pdf' };
  
  return null;
};

export const calculateFileHash = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

export const analyzeDocumentFile = async (
  buffer: Buffer,
  declaredType: string
): Promise<AIDocumentAnalysis> => {
  // 1. Basic Corruption / Readability check
  if (buffer.length < 100) {
    return {
      documentType: 'other',
      confidence: 0,
      extractedText: '',
      isReadable: false,
      isValid: false,
      metadataSummary: 'File size too small. Likely corrupted or unreadable.',
      validationWarnings: ['File size under 100 bytes', 'Unreadable file']
    };
  }

  // 2. Perform mock OCR by scanning the buffer for strings (if image or pdf)
  // In a real production app, you would run OCR (like Tesseract or Google Cloud Vision)
  const fileContentString = buffer.toString('utf8', 0, Math.min(buffer.length, 50000));
  
  let documentType: AIDocumentAnalysis['documentType'] = 'other';
  let confidence = 0.5;
  const warnings: string[] = [];

  // Look for keywords
  const hasAadhaarKeywords = /aadhaar|government of india|unique identification|mira|enrolment/i.test(fileContentString);
  const hasPanKeywords = /permanent account number|income tax department|p\.a\.n\.|govt of india/i.test(fileContentString);
  const hasDLKeywords = /driving licence|licence to drive|transport department|driving license/i.test(fileContentString);
  const hasPassportKeywords = /passport|republic of india|nationality|republica de/i.test(fileContentString);
  const hasStudentIDKeywords = /student id|identity card|card no|school|college|university/i.test(fileContentString);
  const hasEmploymentKeywords = /employee id|employment proof|offer letter|payslip|payslip for/i.test(fileContentString);

  if (hasAadhaarKeywords) {
    documentType = 'aadhaar';
    confidence = 0.9;
  } else if (hasPanKeywords) {
    documentType = 'pan';
    confidence = 0.9;
  } else if (hasDLKeywords) {
    documentType = 'driving_license';
    confidence = 0.95;
  } else if (hasPassportKeywords) {
    documentType = 'passport';
    confidence = 0.95;
  } else if (hasStudentIDKeywords) {
    documentType = 'student_id';
    confidence = 0.85;
  } else if (hasEmploymentKeywords) {
    documentType = 'employment_proof';
    confidence = 0.85;
  }

  // Fallback to declared type if confidence is low
  if (documentType === 'other' && declaredType) {
    documentType = declaredType as any;
    confidence = 0.6;
    warnings.push(`AI could not match signature keywords. Proceeding with user's declared type: ${declaredType}`);
  }

  const matchesDeclared = documentType === declaredType;
  if (!matchesDeclared && declaredType) {
    warnings.push(`Declared type is "${declaredType}" but AI suspects it is "${documentType}"`);
  }

  return {
    documentType,
    confidence,
    extractedText: fileContentString.substring(0, 1000).replace(/[^\x20-\x7E\n\r]/g, ''),
    isReadable: true,
    isValid: matchesDeclared,
    metadataSummary: `Extracted metadata for ${documentType}. File size: ${(buffer.length / 1024).toFixed(1)} KB.`,
    validationWarnings: warnings
  };
};

/**
 * AI Complaint Classification
 */
export interface AIComplaintAnalysis {
  category: 'maintenance' | 'agreement' | 'document' | 'profile' | 'property' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number;
}

export const classifyComplaint = async (description: string): Promise<AIComplaintAnalysis> => {
  const desc = description.toLowerCase();

  let category: AIComplaintAnalysis['category'] = 'general';
  let priority: AIComplaintAnalysis['priority'] = 'medium';
  let confidence = 0.7;

  // 1. Emergency triggers (Urgent)
  const isUrgent = /fire|gas leak|flooding|electric shock|broken lock|robbery|theft|medical|hazard/i.test(desc);
  if (isUrgent) {
    priority = 'urgent';
    confidence = 0.9;
  }

  // 2. Category mapping
  if (/pipe|water|leak|plumb|tap|sink|toilet|drain|clog|sewage/i.test(desc)) {
    category = 'maintenance'; // plumbing maps to maintenance category
    if (priority !== 'urgent') {
      priority = desc.includes('burst') || desc.includes('flood') ? 'high' : 'medium';
    }
    confidence = 0.95;
  } else if (/wire|fuse|spark|shock|light|fan|geyser|switch|mcb|electricity|power cut/i.test(desc)) {
    category = 'maintenance'; // electrical
    if (priority !== 'urgent') {
      priority = desc.includes('spark') || desc.includes('smoke') ? 'high' : 'medium';
    }
    confidence = 0.95;
  } else if (/cleaning|garbage|trash|sweeping|waste|dirty|pest|cockroach|bedbug/i.test(desc)) {
    category = 'maintenance'; // cleaning
    priority = 'low';
    confidence = 0.85;
  } else if (/chair|table|bed|sofa|furniture|door|window|handle|cupboard|wardrobe/i.test(desc)) {
    category = 'maintenance'; // furniture
    priority = 'low';
    confidence = 0.85;
  } else if (/agreement|lease|rent amount|deposit|terms|clause|sign/i.test(desc)) {
    category = 'agreement';
    priority = 'medium';
    confidence = 0.9;
  } else if (/document|upload|verification|aadhaar|pan|id proof|reject/i.test(desc)) {
    category = 'document';
    priority = 'medium';
    confidence = 0.9;
  } else if (/profile|phone number|email|name|edit profile/i.test(desc)) {
    category = 'profile';
    priority = 'low';
    confidence = 0.9;
  } else if (/room|flat|pg|rent detail|address|key/i.test(desc)) {
    category = 'property';
    priority = 'medium';
    confidence = 0.8;
  }

  return { category, priority, confidence };
};
