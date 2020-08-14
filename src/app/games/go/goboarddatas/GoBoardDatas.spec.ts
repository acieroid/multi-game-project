import { GoBoardDatas } from "./GoBoardDatas";
import { GoPartSlice, GoPiece } from "../GoPartSlice";
import { ArrayUtils } from "src/app/collectionlib/arrayutils/ArrayUtils";
import { GroupInfos } from "../gorules/GoRules";
import { Coord } from "src/app/jscaip/coord/Coord";
import { JSDocTagName } from "@angular/compiler/src/output/output_ast";

describe('GoBoardDatas', () => {

    let _: GoPiece = GoPiece.EMPTY;

    let X: GoPiece = GoPiece.WHITE;

    let O: GoPiece = GoPiece.BLACK;

    it('should create one big group for initial board', () => {
        const board: GoPiece[][] = GoPartSlice.getStartingBoard();
        const datas: GoBoardDatas = GoBoardDatas.ofGoPiece(board);
        const allZeroBoard: number[][] = ArrayUtils.createBiArray<number>(GoPartSlice.WIDTH, GoPartSlice.HEIGHT, 0);
        expect(datas.groupIndexes).toEqual(allZeroBoard);
        expect(datas.groups.length).toBe(1);
        const groupInfos: GroupInfos = datas.groups[0];
        expect(groupInfos.coords.length).toBe(GoPartSlice.WIDTH * GoPartSlice.HEIGHT);
        expect(groupInfos.neighboorsEP.length).toBe(0);
    });
    it('should create three neighboor group', () => {
        const board: GoPiece[][] = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, _, X, X, _],
            [_, _, O, _, _],
            [_, _, _, _, _],
        ];
        const datas: GoBoardDatas = GoBoardDatas.ofGoPiece(board);
        const groupIndexes: number[][] = [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 1, 1, 0],
            [0, 0, 2, 0, 0],
            [0, 0, 0, 0, 0],
        ];
        expect(datas.groupIndexes).toEqual(groupIndexes);
        expect(datas.groups.length).toBe(3);

        const emptyGroupInfos: GroupInfos = datas.groups[0];
        expect(emptyGroupInfos.coords.length).toBe(22);
        expect(emptyGroupInfos.neighboorsEP[0]).toEqual(new Coord(2, 3));
        expect(emptyGroupInfos.neighboorsEP[1]).toEqual(new Coord(2, 2));

        const whiteGroupInfos: GroupInfos = datas.groups[1];
        expect(whiteGroupInfos.coords.length).toBe(2, "White group is composed of two stones");
        console.log("neighboors of white: "+ JSON.stringify(whiteGroupInfos.neighboorsEP));
        expect(whiteGroupInfos.neighboorsEP[0]).toEqual(new Coord(0, 0));
        /*expect(whiteGroupInfos.neighboorsEP[1]).toEqual(new Coord(2, 3));

      /*  const blackGroupInfos: GroupInfos = datas.groups[2];
        expect(blackGroupInfos.coords.length).toBe(1, "Black group is composed of two stones");
        expect(blackGroupInfos.neighboorsEP).toBe([new Coord(0, 0), new Coord(2, 2)]);
    */});
});