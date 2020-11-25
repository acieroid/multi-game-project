import { MGPMap } from "src/app/collectionlib/mgpmap/MGPMap";
import { MGPOptional } from "src/app/collectionlib/mgpoptional/MGPOptional";
import { Orthogonale } from "src/app/jscaip/DIRECTION";
import { LegalityStatus } from "src/app/jscaip/LegalityStatus";
import { MNode } from "src/app/jscaip/MNode";
import { Player } from "src/app/jscaip/Player";
import { Rules } from "src/app/jscaip/Rules";
import { PylosCoord } from "../pylos-coord/PylosCoord";
import { PylosMove } from "../pylos-move/PylosMove";
import { PylosPartSlice } from "../pylos-part-slice/PylosPartSlice";

export class PylosNode extends MNode<Rules<PylosMove, PylosPartSlice, LegalityStatus>, PylosMove, PylosPartSlice, LegalityStatus> {}

export class PylosRules extends Rules<PylosMove, PylosPartSlice, LegalityStatus> {

    public constructor() {
        super();
        this.setInitialBoard(); // TODO: generalize Rules constructor like this
    }
    public setInitialBoard(): void {
        if (this.node == null) {
            this.node = MNode.getFirstNode(
                PylosPartSlice.getStartingSlice(),
                this
            );
        } else {
            this.node = this.node.getInitialNode();
        }
    }
    public getListMoves(node: PylosNode): MGPMap<PylosMove, PylosPartSlice> {
        const slice: PylosPartSlice = node.gamePartSlice;
        const result: MGPMap<PylosMove, PylosPartSlice> = new MGPMap<PylosMove, PylosPartSlice>();
        const sliceInfo: { freeToMove: PylosCoord[], landable: PylosCoord[] } =
            PylosRules.getSliceInfo(slice);
        const climbings: PylosMove[] = PylosRules.getClimbingMoves(sliceInfo);
        const drops: PylosMove[] = PylosRules.getDropMoves(sliceInfo);
        const moves: PylosMove[] = climbings.concat(drops);
        for (const move of moves) {
            let possiblesCaptures: PylosCoord[][] = [[]];
            if (PylosRules.canCapture(slice, move.landingCoord)) {
                possiblesCaptures = PylosRules.getPossibleCaptures(sliceInfo.freeToMove,
                                                                   move.startingCoord,
                                                                   move.landingCoord);
            }
            for (const possiblesCapture of possiblesCaptures) {
                const newMove: PylosMove = PylosMove.changeCapture(move, possiblesCapture);
                const newSlice: PylosPartSlice = PylosRules.applyLegalMove(newMove, slice, { legal: true }).resultingSlice;
                result.set(newMove, newSlice);
            }
        }
        return result;
    }
    public static getSliceInfo(slice: PylosPartSlice): { freeToMove: PylosCoord[], landable: PylosCoord[] } {
        const freeToMove: PylosCoord[] = [];
        const landable: PylosCoord[] = [];
        for (let z: number = 0; z < 3; z++) {
            for (let y: number = 0; y < (4 - z); y++) {
                for (let x: number = 0; x < (4 - z); x++) {
                    let c: PylosCoord = new PylosCoord(x, y, z);
                    if (slice.getBoardAt(c) === slice.getCurrentPlayer().value &&
                        slice.isSupporting(c) === false)
                    {
                        freeToMove.push(c);
                    }
                    if (slice.isLandable(c)) {
                        landable.push(c);
                    }
                }
            }
        }
        return { freeToMove, landable };
    }
    public static getClimbingMoves(sliceInfo: { freeToMove: PylosCoord[], landable: PylosCoord[] }): PylosMove[] {
        const moves: PylosMove[] = [];
        for (let startingCoord of sliceInfo.freeToMove) {
            for (let landingCoord of sliceInfo.landable) {
                if (landingCoord.isUpperThan(startingCoord) &&
                    landingCoord.getLowerPieces().some((c: PylosCoord) => startingCoord.equals(c)) === false)
                {
                    const newMove: PylosMove = PylosMove.fromClimb(startingCoord, landingCoord, []);
                    moves.push(newMove);
                }
            }
        }
        return moves;
    }
    public static getDropMoves(sliceInfo: { freeToMove: PylosCoord[], landable: PylosCoord[] }): PylosMove[] {
        const drops: PylosMove[] = [];
        for (const landableCoord of sliceInfo.landable) {
            const newMove: PylosMove = PylosMove.fromDrop(landableCoord, []);
            drops.push(newMove);
        }
        return drops;
    }
    public static canCapture(slice: PylosPartSlice, landingCoord: PylosCoord): boolean {
        const currentPlayer: number = slice.getCurrentPlayer().value;
        for (let vertical of [Orthogonale.UP, Orthogonale.DOWN]) {
            const firstNeighboors: MGPOptional<PylosCoord> = landingCoord.getNextValid(vertical);
            if (firstNeighboors.isPresent() && slice.getBoardAt(firstNeighboors.get()) === currentPlayer) {
                for (let horizontal of [Orthogonale.LEFT, Orthogonale.RIGHT]) {
                    const secondNeighboors: PylosCoord = firstNeighboors
                            .get()
                            .getNextValid(horizontal)
                            .getOrNull();
                    if (secondNeighboors && slice.getBoardAt(secondNeighboors) === currentPlayer) {
                        const thirdDirection = vertical.getOpposite();
                        const thirdNeighboors: PylosCoord = secondNeighboors.getNextValid(thirdDirection).get();
                        if (slice.getBoardAt(thirdNeighboors) === currentPlayer) return true;
                    }
                }
            }
        }
        return false;
    }
    public static getPossibleCaptures(freeToMoves: PylosCoord[],
                                      startingCoord: MGPOptional<PylosCoord>,
                                      landingCoord: PylosCoord): PylosCoord[][] {
        const possiblesCapturesSet: PylosCoord[][] = [];

        freeToMoves = freeToMoves.filter((c: PylosCoord) => c.equals(startingCoord.getOrNull()) === false);

        const capturables: PylosCoord[] = freeToMoves.concat(landingCoord);
        for (let i: number = 0; i < capturables.length; i++) {
            const firstCapture: PylosCoord = capturables[i];
            possiblesCapturesSet.push([firstCapture]);
            for (let j: number = i + 1; j < capturables.length; j++) {
                const secondCapture: PylosCoord = capturables[j];
                possiblesCapturesSet.push([secondCapture, firstCapture]);
            }
        }
        return possiblesCapturesSet;
    }
    public getBoardValue(move: PylosMove, slice: PylosPartSlice): number {
        const ownershipMap: { [owner: number]: number } = slice.getPiecesRepartition();
        if (ownershipMap[Player.ZERO.value] === 15) return Number.MAX_SAFE_INTEGER;
        if (ownershipMap[Player.ONE.value] === 15) return Number.MIN_SAFE_INTEGER;
        return ownershipMap[Player.ZERO.value] - ownershipMap[Player.ONE.value];
    }
    public static applyLegalMove(move: PylosMove, slice: PylosPartSlice, status: LegalityStatus): { resultingMove: PylosMove; resultingSlice: PylosPartSlice; } {
        return { resultingMove: move, resultingSlice: slice.applyLegalMove(move) };
    }
    public applyLegalMove(move: PylosMove, slice: PylosPartSlice, status: LegalityStatus): { resultingMove: PylosMove; resultingSlice: PylosPartSlice; } {
        return PylosRules.applyLegalMove(move, slice, status);
    }
    public isLegal(move: PylosMove, slice: PylosPartSlice): LegalityStatus {
        if (slice.getBoardAt(move.landingCoord) !== Player.NONE.value) return { legal: false };

        const startingCoord: PylosCoord = move.startingCoord.getOrNull();
        const currentPlayer: number = slice.getCurrentPlayer().value;

        if (startingCoord != null) {
            if (slice.getBoardAt(startingCoord) !== currentPlayer) return { legal: false };

            const supportedPieces: PylosCoord[] = startingCoord.getHigherPieces()
                .filter((p: PylosCoord) => slice.getBoardAt(p) !== Player.NONE.value ||
                                           p.equals(move.landingCoord));
            if (supportedPieces.length > 0) return { legal: false };
        }
        if (!slice.isLandable(move.landingCoord)) return { legal: false };

        if (move.firstCapture.isPresent()) {
            if (!PylosRules.canCapture(slice, move.landingCoord)) return { legal: false };

            if (PylosRules.isValidCapture(slice, move, move.firstCapture.get())) {
                if (move.secondCapture.isPresent() &&
                    !PylosRules.isValidCapture(slice, move, move.secondCapture.get())) {
                    return { legal: false };
                }
            } else return { legal: false };
        }
        return { legal: true };
    }
    public static isValidCapture(slice: PylosPartSlice, move: PylosMove, capture: PylosCoord): boolean {
        const currentPlayer: number = slice.getCurrentPlayer().value;
        if (!capture.equals(move.landingCoord) &&
            slice.getBoardAt(capture) !== currentPlayer) {
            return false;
        }
        const supportedPieces: PylosCoord[] = capture.getHigherPieces()
            .filter((p: PylosCoord) => slice.getBoardAt(p) !== Player.NONE.value &&
                                       p.equals(move.firstCapture.get()) === false);
        if (supportedPieces.length > 0) {
            return false;
        }
        return true;
    }
}