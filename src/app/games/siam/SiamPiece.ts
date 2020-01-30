import { Player } from "src/app/jscaip/Player";
import { Orthogonale } from "src/app/jscaip/DIRECTION";
import { SiamMoveNature } from "./SiamMove";

export class SiamPiece {

    public static readonly EMPTY: SiamPiece = new SiamPiece(0);

    public static readonly WHITE_UP: SiamPiece = new SiamPiece(1);

    public static readonly WHITE_RIGHT: SiamPiece = new SiamPiece(2);

    public static readonly WHITE_DOWN: SiamPiece = new SiamPiece(3);

    public static readonly WHITE_LEFT: SiamPiece = new SiamPiece(4);

    public static readonly BLACK_UP: SiamPiece = new SiamPiece(5);

    public static readonly BLACK_RIGHT: SiamPiece = new SiamPiece(6);

    public static readonly BLACK_DOWN: SiamPiece = new SiamPiece(7);

    public static readonly BLACK_LEFT: SiamPiece = new SiamPiece(8);

    public static readonly MOUNTAIN: SiamPiece = new SiamPiece(9);

    public static decode(value: number): SiamPiece {
        switch (value) {
            case 0: return SiamPiece.EMPTY;
            case 1: return SiamPiece.WHITE_UP;
            case 2: return SiamPiece.WHITE_RIGHT;
            case 3: return SiamPiece.WHITE_DOWN;
            case 4: return SiamPiece.WHITE_LEFT;
            case 5: return SiamPiece.BLACK_UP;
            case 6: return SiamPiece.BLACK_RIGHT;
            case 7: return SiamPiece.BLACK_DOWN;
            case 8: return SiamPiece.BLACK_LEFT;
            case 9: return SiamPiece.MOUNTAIN;
            default: throw new Error("Unknown value for SiamPiece");
        }
    }
    public static belongTo(value: number, player: Player): boolean {
        if (player === Player.ZERO) {
            return (0 < value && value < 5);
        }
        if (player === Player.ONE) {
            return (4 < value && value < 9);
        }
        throw new Error("Player.NONE do not own piece");
    }
    public static getOwner(value: number): Player {
        if (0 < value && value < 5) return Player.ZERO;
        if (4 < value && value < 9) return Player.ONE;
        return Player.NONE;
    }
    public static getNullableDirection(value: number): Orthogonale {
        switch (value) {
            case 0: return null;
            case 1: return Orthogonale.UP;
            case 5: return Orthogonale.UP;
            case 2: return Orthogonale.RIGHT;
            case 6: return Orthogonale.RIGHT;
            case 3: return Orthogonale.DOWN;
            case 7: return Orthogonale.DOWN;
            case 4: return Orthogonale.LEFT;
            case 8: return Orthogonale.LEFT;
            case 9: return null;
        }
    }
    public static getDirection(value: number): Orthogonale {
        const direction: Orthogonale = SiamPiece.getNullableDirection(value);
        if (direction == null) throw new Error("Direction cannot be null");
        return direction;
    }
    public static of(orientation: Orthogonale, player: Player): SiamPiece {
        if (player === Player.ZERO) {
            if (orientation === Orthogonale.UP) return SiamPiece.WHITE_UP;
            if (orientation === Orthogonale.RIGHT) return SiamPiece.WHITE_RIGHT;
            if (orientation === Orthogonale.DOWN) return SiamPiece.WHITE_DOWN;
            if (orientation === Orthogonale.LEFT) return SiamPiece.WHITE_LEFT;
        } else if (player === Player.ONE) {
            if (orientation === Orthogonale.UP) return SiamPiece.BLACK_UP;
            if (orientation === Orthogonale.RIGHT) return SiamPiece.BLACK_RIGHT;
            if (orientation === Orthogonale.DOWN) return SiamPiece.BLACK_DOWN;
            if (orientation === Orthogonale.LEFT) return SiamPiece.BLACK_LEFT;
        }
        throw new Error("Player None don't have any pieces");
    }
    public static rotate(piece: number, rotation: SiamMoveNature): number {
        if (rotation.value === SiamMoveNature.ANTI_CLOCKWISE.value) {
            switch (piece) {
                case 1: return 4;
                case 2: return 1;
                case 3: return 2;
                case 4: return 3;
                case 5: return 8;
                case 6: return 5;
                case 7: return 6;
                case 8: return 7;
                default: throw new Error("Unknown value for SiamPiece");
            }
        } else if (rotation.value === SiamMoveNature.CLOCKWISE.value) {
            switch (piece) {
                case 1: return 2;
                case 2: return 3;
                case 3: return 4;
                case 4: return 1;
                case 5: return 6;
                case 6: return 7;
                case 7: return 8;
                case 8: return 5;
                default: throw new Error("Unknown value for SiamPiece");
            }
        }
        throw new Error("Cannot rotate in 'FORWARD' direction");
    }
    private constructor(public readonly value: number) {}
}