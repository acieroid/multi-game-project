import { LegalityStatus } from 'src/app/jscaip/LegalityStatus';
import { Player } from 'src/app/jscaip/player/Player';
import { PylosCoord } from '../pylos-coord/PylosCoord';
import { PylosMove } from '../pylos-move/PylosMove';
import { PylosPartSlice } from '../pylos-part-slice/PylosPartSlice';
import { PylosRules } from './PylosRules';

describe('PylosRules:', () => {
    let rules: PylosRules;

    const _: number = Player.NONE.value;
    const O: number = Player.ZERO.value;
    const X: number = Player.ONE.value;

    beforeEach(() => {
        rules = new PylosRules(PylosPartSlice);
    });
    it('should forbid move who\'se landing coord is not empty', () => {
        const board: number[][][] = [
            [
                [O, _, _, _],
                [_, _, _, _],
                [_, _, _, _],
                [_, _, _, _],
            ], [
                [_, _, _],
                [_, _, _],
                [_, _, _],
            ], [
                [_, _],
                [_, _],
            ], [
                [_],
            ],
        ];

        const slice: PylosPartSlice = new PylosPartSlice(board, 0);
        const move: PylosMove = PylosMove.fromDrop(new PylosCoord(0, 0, 0), []);
        const status: LegalityStatus = rules.isLegal(move, slice);
        expect(status.legal.isSuccess()).toBeFalse();
    });
    it('should forbid move who\'se starting coord is not a player\'s piece', () => {
        const board: number[][][] = [
            [
                [_, _, _, _],
                [_, _, _, _],
                [_, _, O, X],
                [_, _, X, O],
            ], [
                [_, _, _],
                [_, _, _],
                [_, _, _],
            ], [
                [_, _],
                [_, _],
            ], [
                [_],
            ],
        ];

        const slice: PylosPartSlice = new PylosPartSlice(board, 0);
        const move: PylosMove = PylosMove.fromClimb(new PylosCoord(0, 0, 0), new PylosCoord(2, 2, 1), []);
        const status: LegalityStatus = rules.isLegal(move, slice);
        expect(status.legal.isSuccess()).toBeFalse();
    });
    it('should forbid move who\'se landing coord is not landable (not on the floor, not over 4 lower pieces)', () => {
        const board: number[][][] = [
            [
                [_, _, _, _],
                [_, _, _, _],
                [_, _, _, _],
                [_, _, _, _],
            ], [
                [_, _, _],
                [_, _, _],
                [_, _, _],
            ], [
                [_, _],
                [_, _],
            ], [
                [_],
            ],
        ];

        const slice: PylosPartSlice = new PylosPartSlice(board, 0);
        const move: PylosMove = PylosMove.fromDrop(new PylosCoord(0, 0, 1), []);
        const status: LegalityStatus = rules.isLegal(move, slice);
        expect(status.legal.isSuccess()).toBeFalse();
    });
    it('should forbid move who capture without having formed a squared', () => {
        const board: number[][][] = [
            [
                [O, _, _, _],
                [_, _, _, _],
                [_, _, _, _],
                [_, _, _, O],
            ], [
                [_, _, _],
                [_, _, _],
                [_, _, _],
            ], [
                [_, _],
                [_, _],
            ], [
                [_],
            ],
        ];

        const slice: PylosPartSlice = new PylosPartSlice(board, 0);
        const move: PylosMove = PylosMove.fromDrop(new PylosCoord(0, 3, 0), [new PylosCoord(0, 0, 0), new PylosCoord(3, 3, 0)]);
        const status: LegalityStatus = rules.isLegal(move, slice);
        expect(status.legal.isSuccess()).toBeFalse();
    });
    it('should forbid move who capture non-player piece or supporting-piece', () => {
        const board: number[][][] = [
            [
                [_, O, O, _],
                [O, O, X, _],
                [_, _, _, _],
                [_, _, _, _],
            ], [
                [_, O, _],
                [_, _, _],
                [_, _, _],
            ], [
                [_, _],
                [_, _],
            ], [
                [_],
            ],
        ];

        const slice: PylosPartSlice = new PylosPartSlice(board, 0);

        const move: PylosMove = PylosMove.fromDrop(new PylosCoord(0, 0, 0), [new PylosCoord(2, 2, 0)]);
        const status: LegalityStatus = rules.isLegal(move, slice);
        expect(status.legal.isSuccess()).toBeFalse();

        const otherMove: PylosMove = PylosMove.fromDrop(new PylosCoord(0, 0, 0), [new PylosCoord(0, 0, 0), new PylosCoord(1, 0, 0)]);
        const otherStatus: LegalityStatus = rules.isLegal(otherMove, slice);
        expect(otherStatus.legal.isSuccess()).toBeFalse();
    });
    it('should allow legal capture to include landing piece', () => {
        const board: number[][][] = [
            [
                [_, O, _, _],
                [O, O, _, _],
                [_, _, _, _],
                [_, _, _, _],
            ], [
                [_, _, _],
                [_, _, _],
                [_, _, _],
            ], [
                [_, _],
                [_, _],
            ], [
                [_],
            ],
        ];

        const slice: PylosPartSlice = new PylosPartSlice(board, 0);
        const move: PylosMove = PylosMove.fromDrop(new PylosCoord(0, 0, 0), [new PylosCoord(0, 0, 0)]);
        const status: LegalityStatus = rules.isLegal(move, slice);
        expect(status.legal.isSuccess()).toBeTrue();
    });
    it('should forbid piece to climb over itself', () => {
        const board: number[][][] = [
            [
                [X, O, _, _],
                [O, O, _, _],
                [_, _, _, _],
                [_, _, _, _],
            ], [
                [_, _, _],
                [_, _, _],
                [_, _, _],
            ], [
                [_, _],
                [_, _],
            ], [
                [_],
            ],
        ];

        const slice: PylosPartSlice = new PylosPartSlice(board, 0);
        const move: PylosMove = PylosMove.fromClimb(new PylosCoord(1, 1, 0), new PylosCoord(0, 0, 1), []);
        const status: LegalityStatus = rules.isLegal(move, slice);
        expect(status.legal.isSuccess()).toBeFalse();
    });
    it('should forbid piece to climb when supporting', () => {
        const board: number[][][] = [
            [
                [X, O, _, _],
                [O, O, _, _],
                [X, X, _, _],
                [_, _, _, _],
            ], [
                [O, _, _],
                [_, _, _],
                [_, _, _],
            ], [
                [_, _],
                [_, _],
            ], [
                [_],
            ],
        ];

        const slice: PylosPartSlice = new PylosPartSlice(board, 0);
        const move: PylosMove = PylosMove.fromClimb(new PylosCoord(1, 0, 0), new PylosCoord(0, 1, 1), []);
        const status: LegalityStatus = rules.isLegal(move, slice);
        expect(status.legal.isSuccess()).toBeFalse();
    });
    it('should allow legal capture to include piece supporting previously captured stone', () => {
        const board: number[][][] = [
            [
                [X, O, X, O],
                [O, X, O, X],
                [X, O, X, O],
                [O, _, _, _],
            ], [
                [_, O, X],
                [O, O, X],
                [_, _, _],
            ], [
                [_, O],
                [_, _],
            ], [
                [_],
            ],
        ];

        const slice: PylosPartSlice = new PylosPartSlice(board, 0);
        const move: PylosMove = PylosMove.fromClimb(new PylosCoord(0, 3, 0), new PylosCoord(0, 0, 1), [new PylosCoord(1, 0, 2), new PylosCoord(1, 0, 1)]);
        const status: LegalityStatus = rules.isLegal(move, slice);
        expect(status.legal.isSuccess()).toBeTrue();
    });
    it('should declare looser Player.ZERO when he put his 15th ball', () => {
        const board: number[][][] = [
            [
                [X, O, X, O],
                [O, O, O, O],
                [X, O, X, O],
                [O, O, O, O],
            ], [
                [O, _, _],
                [_, O, _],
                [_, _, _],
            ], [
                [_, _],
                [_, _],
            ], [
                [_],
            ],
        ];

        const slice: PylosPartSlice = new PylosPartSlice(board, 0);
        const move: PylosMove = PylosMove.fromDrop(new PylosCoord(2, 2, 1), []);
        const status: LegalityStatus = rules.isLegal(move, slice);
        expect(status.legal.isSuccess()).toBeTrue();
        const resultingSlice: PylosPartSlice = rules.applyLegalMove(move, slice, status).resultingSlice;
        expect(rules.getBoardValue(move, resultingSlice)).toBe(Number.MAX_SAFE_INTEGER);
    });
    it('should declare looser Player.ONE when he put his 15th ball', () => {
        const board: number[][][] = [
            [
                [O, X, O, X],
                [X, X, X, X],
                [O, X, O, X],
                [X, X, X, X],
            ], [
                [X, _, _],
                [_, X, _],
                [_, _, _],
            ], [
                [_, _],
                [_, _],
            ], [
                [_],
            ],
        ];

        const slice: PylosPartSlice = new PylosPartSlice(board, 1);
        const move: PylosMove = PylosMove.fromDrop(new PylosCoord(2, 2, 1), []);
        const status: LegalityStatus = rules.isLegal(move, slice);
        expect(status.legal.isSuccess()).toBeTrue();
        const resultingSlice: PylosPartSlice = rules.applyLegalMove(move, slice, status).resultingSlice;
        expect(rules.getBoardValue(move, resultingSlice)).toBe(Number.MIN_SAFE_INTEGER);
    });
});
