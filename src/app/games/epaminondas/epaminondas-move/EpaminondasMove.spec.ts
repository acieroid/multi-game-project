import { MGPMap } from 'src/app/utils/mgp-map/MGPMap';
import { Coord } from 'src/app/jscaip/coord/Coord';
import { Direction } from 'src/app/jscaip/DIRECTION';
import { EpaminondasPartSlice } from '../epaminondas-part-slice/EpaminondasPartSlice';
import { EpaminondasRules } from '../epaminondas-rules/EpaminondasRules';
import { EpaminondasMove } from './EpaminondasMove';

describe('EpaminondasMove: ', () => {
    it('Should forbid null values', () => {
        expect(() => new EpaminondasMove(null, 1, 1, 1, Direction.UP)).toThrowError('X cannot be null.');
        expect(() => new EpaminondasMove(1, null, 1, 1, Direction.UP)).toThrowError('Y cannot be null.');
        expect(() => new EpaminondasMove(1, 1, null, 1, Direction.UP)).toThrowError('Number of moved pieces cannot be null.');
        expect(() => new EpaminondasMove(1, 1, 1, null, Direction.UP)).toThrowError('Step size cannot be null.');
        expect(() => new EpaminondasMove(1, 1, 1, 1, null)).toThrowError('Direction cannot be null.');
    });
    it('Should forbid out of range coords', () => {
        expect(() => new EpaminondasMove(-1, 0, 1, 1, Direction.DOWN_LEFT)).toThrowError('Illegal coord outside of board (-1, 0).');
        expect(() => new EpaminondasMove(0, 13, 1, 1, Direction.UP_RIGHT)).toThrowError('Illegal coord outside of board (0, 13).');
    });
    it('Should forbid invalid step size and number of selected piece', () => {
        expect(() => new EpaminondasMove(0, 0, 2, 3, Direction.UP)).toThrowError('Cannot move a phalanx further than its size (got step size 3 for 2 pieces).');
        expect(() => new EpaminondasMove(0, 0, -1, 0, Direction.UP)).toThrowError('Must select minimum one piece (got -1).');
        expect(() => new EpaminondasMove(2, 2, 1, 0, Direction.UP)).toThrowError('Step size must be minimum one (got 0).');
    });
    it('EpaminondasMove.encode and EpaminondasMove.decode should be reversible', () => {
        const rules: EpaminondasRules = new EpaminondasRules(EpaminondasPartSlice);
        const moves: MGPMap<EpaminondasMove, EpaminondasPartSlice> = rules.getListMoves(rules.node);
        for (let i = 0; i < moves.size(); i++) {
            const move: EpaminondasMove = moves.getByIndex(i).key;
            const encodedMove: number = move.encode();
            const decodedMove: EpaminondasMove = EpaminondasMove.decode(encodedMove);
            expect(decodedMove).toEqual(move);
        }
    });
    it('Should forbid non integer number to decode', () => {
        expect(() => EpaminondasMove.decode(0.5)).toThrowError('EncodedMove must be an integer.');
    });
    it('should delegate decoding to static method', () => {
        const testMove: EpaminondasMove = new EpaminondasMove(10, 11, 2, 1, Direction.UP);
        spyOn(EpaminondasMove, 'decode').and.callThrough();
        testMove.decode(testMove.encode());
        expect(EpaminondasMove.decode).toHaveBeenCalledTimes(1);
    });
    it('Should override correctly equals and toString', () => {
        const move: EpaminondasMove = new EpaminondasMove(4, 3, 2, 1, Direction.UP);
        const neighboor: EpaminondasMove = new EpaminondasMove(0, 0, 2, 1, Direction.UP);
        const twin: EpaminondasMove = new EpaminondasMove(4, 3, 2, 1, Direction.UP);
        const firstCousin: EpaminondasMove = new EpaminondasMove(4, 3, 1, 1, Direction.UP);
        const secondCousin: EpaminondasMove = new EpaminondasMove(4, 3, 2, 2, Direction.UP);
        const thirdCousin: EpaminondasMove = new EpaminondasMove(4, 3, 2, 1, Direction.LEFT);
        expect(move.equals(move)).toBeTrue();
        expect(move.equals(neighboor)).toBeFalse();
        expect(move.equals(firstCousin)).toBeFalse();
        expect(move.equals(secondCousin)).toBeFalse();
        expect(move.equals(thirdCousin)).toBeFalse();
        expect(move.equals(twin)).toBeTrue();
        expect(move.toString()).toBe('EpaminondasMove((4, 3), m:2, s:1, UP)');
    });
});
