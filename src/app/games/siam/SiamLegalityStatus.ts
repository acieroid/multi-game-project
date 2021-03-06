import { MGPValidation } from 'src/app/utils/mgp-validation/MGPValidation';
import { LegalityStatus } from 'src/app/jscaip/LegalityStatus';

export class SiamLegalityStatus implements LegalityStatus {
    public static failure(reason: string): SiamLegalityStatus {
        return { legal: MGPValidation.failure(reason), resultingBoard: null };
    }

    public legal: MGPValidation;

    public resultingBoard: number[][];
}
