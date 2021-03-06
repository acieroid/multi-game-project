import { GamePartSlice } from 'src/app/jscaip/GamePartSlice';
import { EncapsulePiece, Size, EncapsuleMapper } from './EncapsuleEnums';
import { Player } from 'src/app/jscaip/player/Player';
import { ArrayUtils } from 'src/app/utils/collection-lib/array-utils/ArrayUtils';

export class EncapsulePartSlice extends GamePartSlice {
    private readonly remainingPieces: ReadonlyArray<EncapsulePiece>;

    constructor(board: number[][], turn: number, remainingPieces: EncapsulePiece[]) {
        super(board, turn);
        if (remainingPieces == null) throw new Error('RemainingPieces cannot be null');
        this.remainingPieces = remainingPieces;
    }
    public static getInitialSlice(): EncapsulePartSlice {
        const emptyCase: EncapsuleCase = new EncapsuleCase(Player.NONE, Player.NONE, Player.NONE);
        const emptyNumber: number = emptyCase.encode();
        const startingBoard: number[][] = ArrayUtils.createBiArray(3, 3, emptyNumber);
        const initialPieces: EncapsulePiece[] = [
            EncapsulePiece.BIG_BLACK, EncapsulePiece.BIG_BLACK, EncapsulePiece.BIG_WHITE,
            EncapsulePiece.BIG_WHITE, EncapsulePiece.MEDIUM_BLACK, EncapsulePiece.MEDIUM_BLACK,
            EncapsulePiece.MEDIUM_WHITE, EncapsulePiece.MEDIUM_WHITE, EncapsulePiece.SMALL_BLACK,
            EncapsulePiece.SMALL_BLACK, EncapsulePiece.SMALL_WHITE, EncapsulePiece.SMALL_WHITE
        ];
        return new EncapsulePartSlice(startingBoard, 0, initialPieces);
    }
    public getRemainingPiecesCopy(): EncapsulePiece[] {
        return ArrayUtils.copyImmutableArray(this.remainingPieces);
    }
    public static pieceBelongToCurrentPlayer(piece: EncapsulePiece, turn: number): boolean {
        const pieceOwner: Player = EncapsuleMapper.toPlayer(piece);
        if (pieceOwner === Player.ZERO) return turn%2 === 0;
        if (pieceOwner === Player.ONE) return turn%2 === 1;
        return false;
    }
    public pieceBelongToCurrentPlayer(piece: EncapsulePiece): boolean {
        return EncapsulePartSlice.pieceBelongToCurrentPlayer(piece, this.turn);
    }
    public isDropable(piece: EncapsulePiece): boolean {
        if (!this.pieceBelongToCurrentPlayer(piece)) {
            return false;
        }
        return this.remainingPieces.some((p: EncapsulePiece) => p === piece);
    }
    public toCase(): EncapsuleCase[][] {
        return this.board.map((line: number[]) =>
            line.map((n: number) => EncapsuleCase.decode(n))); // TODO: check no one do that twice
    }
    public static toNumberBoard(board: EncapsuleCase[][]): number[][] {
        return board.map((line: EncapsuleCase[]) => line.map((c: EncapsuleCase) => c.encode()));
    }
    public getPlayerRemainingPieces(): EncapsulePiece[] {
        return this.remainingPieces.filter((piece: EncapsulePiece) => this.pieceBelongToCurrentPlayer(piece));
    }
}

export class EncapsuleCase {
    public static readonly EMPTY: EncapsuleCase = new EncapsuleCase(Player.NONE, Player.NONE, Player.NONE);

    public readonly small: Player;

    public readonly medium: Player;

    public readonly big: Player;

    constructor(small: Player, medium: Player, big: Player) {
        if (small == null) throw new Error('Small cannot be null');
        if (medium == null) throw new Error('Medium cannot be null');
        if (big == null) throw new Error('Big cannot be null');
        this.small = small;
        this.medium = medium;
        this.big = big;
    }
    public toString(): string {
        const pieceNames: string[] = this.toOrderedPieceNames();
        return '(' + pieceNames[0] + ', ' + pieceNames[1] + ', ' + pieceNames[2] + ')';
    }
    public toOrderedPieceNames(): string[] {
        const smallPiece: EncapsulePiece = EncapsuleMapper.toValidPiece(Size.SMALL, this.small);
        const mediumPiece: EncapsulePiece = EncapsuleMapper.toValidPiece(Size.MEDIUM, this.medium);
        const bigPiece: EncapsulePiece = EncapsuleMapper.toValidPiece(Size.BIG, this.big);
        return [EncapsuleMapper.getNameFromPiece(smallPiece),
            EncapsuleMapper.getNameFromPiece(mediumPiece),
            EncapsuleMapper.getNameFromPiece(bigPiece)];
    }
    public getBiggest(): EncapsulePiece {
        if (this.big === Player.ZERO) return EncapsulePiece.BIG_BLACK;
        if (this.big === Player.ONE) return EncapsulePiece.BIG_WHITE;
        if (this.medium === Player.ZERO) return EncapsulePiece.MEDIUM_BLACK;
        if (this.medium === Player.ONE) return EncapsulePiece.MEDIUM_WHITE;
        if (this.small === Player.ZERO) return EncapsulePiece.SMALL_BLACK;
        if (this.small === Player.ONE) return EncapsulePiece.SMALL_WHITE;
        return EncapsulePiece.NONE;
    }
    public tryToSuperposePiece(piece: EncapsulePiece): {success: boolean; result: EncapsuleCase} {
        const biggestPresent: Size = EncapsuleMapper.toSize(this.getBiggest());
        if (piece === EncapsulePiece.NONE) {
            throw new Error('Cannot move NONE on a case');
        }
        const pieceSize: Size = EncapsuleMapper.toSize(piece);
        if (pieceSize > biggestPresent) {
            return { success: true, result: this.put(piece) };
        } else {
            return { success: false, result: null };
        }
    }
    public removeBiggest(): {removedCase: EncapsuleCase, removedPiece: EncapsulePiece} {
        const removedPiece: EncapsulePiece = this.getBiggest();
        if (removedPiece === EncapsulePiece.NONE) {
            throw new Error('Cannot removed piece from empty case');
        }
        const removedSize: Size = EncapsuleMapper.toSize(removedPiece);
        let removedCase: EncapsuleCase;
        if (removedSize === Size.BIG) {
            removedCase = new EncapsuleCase(this.small, this.medium, Player.NONE);
        } else if (removedSize === Size.MEDIUM) {
            removedCase = new EncapsuleCase(this.small, Player.NONE, Player.NONE);
        } else if (removedSize === Size.SMALL) {
            removedCase = new EncapsuleCase(Player.NONE, Player.NONE, Player.NONE);
        }
        return { removedCase, removedPiece };
    }
    public put(piece: EncapsulePiece): EncapsuleCase {
        if (piece === EncapsulePiece.NONE) throw new Error('Cannot put NONE on case');
        const pieceSize: Size = EncapsuleMapper.toSize(piece);
        const piecePlayer: Player = EncapsuleMapper.toPlayer(piece);
        if (pieceSize === Size.BIG) {
            return new EncapsuleCase(this.small, this.medium, piecePlayer);
        }
        if (pieceSize === Size.MEDIUM) {
            return new EncapsuleCase(this.small, piecePlayer, this.big);
        }
        if (pieceSize === Size.SMALL) {
            return new EncapsuleCase(piecePlayer, this.medium, this.big);
        }
    }
    public encode(): number {
        return this.small.value +
               this.medium.value*3 +
               this.big.value*9;
    }
    public static decode(encapsuleCase: number): EncapsuleCase {
        if (encapsuleCase%1 !== 0) throw new Error('EncapsuleCase must be encoded as integer: ' + encapsuleCase);
        if (encapsuleCase < 0) throw new Error('To small representation for EncapsuleCase: ' + encapsuleCase);
        if (encapsuleCase > 26) throw new Error('To big representation for EncapsuleCase: ' + encapsuleCase);
        const small: Player = Player.of(encapsuleCase%3);
        encapsuleCase -= small.value;
        encapsuleCase/=3;
        const medium: Player = Player.of(encapsuleCase%3);
        encapsuleCase -= medium.value;
        encapsuleCase/=3;
        const big: Player = Player.of(encapsuleCase);
        return new EncapsuleCase(small, medium, big);
    }
    public belongToCurrentPlayer(currentPlayer: Player): boolean {
        const biggest: EncapsulePiece = this.getBiggest();
        const owner: Player = EncapsuleMapper.toPlayer(biggest);
        return owner === currentPlayer;
    }
}
