import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTemplateDto {
  @IsString() @MinLength(1) type!: string; // tax80g | course | volunteer | <custom>
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(1) template!: string; // HTML with {{placeholders}}
}

export class UpdateTemplateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() template?: string;
}

export class IssueCertificateDto {
  @IsString() @MinLength(1) type!: string;
  @IsOptional() @IsString() templateName?: string; // pick a specific template of that type
  @IsOptional() @IsString() subjectName?: string;
  @IsOptional() @IsString() subjectEmail?: string;
  @IsOptional() @IsObject() data?: Record<string, unknown>;
  @IsOptional() @IsString() refType?: string;
  @IsOptional() @IsString() refId?: string;
}

/** A sensible print-ready default 80G certificate template (tenants can override). */
export const DEFAULT_80G_TEMPLATE = `<!doctype html>
<html><head><meta charset="utf-8"><title>80G Donation Certificate</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;margin:0;padding:40px;}
  .cert{max-width:800px;margin:0 auto;border:3px double #1B5E20;padding:40px 48px;}
  h1{color:#1B5E20;text-align:center;margin:0 0 4px;font-size:26px;}
  .sub{text-align:center;color:#555;margin-bottom:24px;}
  .org{text-align:center;font-size:18px;font-weight:bold;}
  .row{display:flex;justify-content:space-between;margin:6px 0;}
  table{width:100%;border-collapse:collapse;margin:20px 0;}
  td,th{border:1px solid #ccc;padding:8px 10px;text-align:left;font-size:14px;}
  .amt{font-size:20px;font-weight:bold;color:#1B5E20;}
  .footer{margin-top:28px;font-size:12px;color:#666;}
  .code{font-family:monospace;}
</style></head>
<body><div class="cert">
  <h1>Donation Receipt &amp; 80G Certificate</h1>
  <div class="sub">Issued under Section 80G of the Income Tax Act, 1961 (India)</div>
  <div class="org">{{orgLegalName}}</div>
  <div class="sub">{{orgAddress}}<br/>PAN: {{orgPan}}</div>
  <table>
    <tr><th>Receipt No.</th><td>{{receiptNumber}}</td><th>Date</th><td>{{issueDate}}</td></tr>
    <tr><th>Donor</th><td>{{donorName}}</td><th>Email</th><td>{{donorEmail}}</td></tr>
    <tr><th>Amount</th><td class="amt">{{currency}} {{amountMajor}}</td>
        <th>Mode</th><td>{{paymentMode}}</td></tr>
  </table>
  <p>Received with thanks the above donation. Donations to {{orgLegalName}} are eligible
     for deduction under Section 80G.</p>
  <div class="row"><div>80G Reg. No.: <b>{{reg80GNumber}}</b></div>
       <div>80G Dated: <b>{{reg80GDate}}</b></div></div>
  <div class="footer">
    Verification code: <span class="code">{{verificationCode}}</span><br/>
    Verify authenticity at: {{verifyUrl}}
  </div>
</div></body></html>`;
