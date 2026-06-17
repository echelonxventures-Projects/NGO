import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

/**
 * Shared QR-code generation. Free, offline, no external service. Used for student/teacher ID
 * cards, event tickets and deep-link QRs. Emits either a data-URL PNG (for <img>) or inline
 * SVG (for crisp print/scaling).
 */
@Injectable()
export class QrService {
  toDataUrl(payload: string): Promise<string> {
    return QRCode.toDataURL(payload, { margin: 1, width: 256 });
  }

  toSvg(payload: string): Promise<string> {
    return QRCode.toString(payload, { type: 'svg', margin: 1 });
  }
}
