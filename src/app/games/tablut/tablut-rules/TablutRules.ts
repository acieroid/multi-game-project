import { Orthogonal, Direction } from '../../../jscaip/DIRECTION';
import { Rules } from '../../../jscaip/Rules';
import { Coord } from '../../../jscaip/coord/Coord';
import { MGPNode } from 'src/app/jscaip/mgp-node/MGPNode';
import { TablutPartSlice } from '../TablutPartSlice';
import { TablutMove } from '../tablut-move/TablutMove';
import { MGPMap } from 'src/app/utils/mgp-map/MGPMap';
import { TablutRulesConfig } from './TablutRulesConfig';
import { Player } from 'src/app/jscaip/player/Player';
import { TablutCase } from './TablutCase';
import { MGPOptional } from 'src/app/utils/mgp-optional/MGPOptional';
import { display } from 'src/app/utils/collection-lib/utils';
import { MGPValidation } from 'src/app/utils/mgp-validation/MGPValidation';
import { NumberTable } from 'src/app/utils/collection-lib/array-utils/ArrayUtils';
import { TablutLegalityStatus } from '../TablutLegalityStatus';
import { RelativePlayer } from 'src/app/jscaip/RelativePlayer';

export abstract class TablutNode extends MGPNode<TablutRules, TablutMove, TablutPartSlice, TablutLegalityStatus> {}

export class TablutRules extends Rules<TablutMove, TablutPartSlice, TablutLegalityStatus> {
    public static VERBOSE: boolean = false;

    // statics fields :

    public static CASTLE_IS_LEFT_FOR_GOOD = false;
    // once the king leave the castle he cannot re-station there
    public static NORMAL_CAPTURE_WORK_ON_THE_KING = false;
    // king can be capture by only two opposed invaders
    public static CAPTURE_KING_AGAINST_THRONE_RULES = false;
    // the throne is considered an ennemy to the king
    public static CAPTURE_PAWN_AGAINST_THRONE_RULES = true;
    // the throne is considered an ennemy to the pawn
    public static THREE_INVADER_AND_A_BORDER_CAN_CAPTURE_KING = true;
    // the king can be captured by only three invaders if he's against the corner

    // statics methods :
    private static applyLegalMove(move: TablutMove, slice: TablutPartSlice, status: TablutLegalityStatus): { resultingMove: TablutMove; resultingSlice: TablutPartSlice; } {
        display(TablutRules.VERBOSE, { TablutRules_applyLegalMove: { move, slice, status } });
        // copies
        const turn: number = slice.turn;

        const resultingSlice: TablutPartSlice = new TablutPartSlice(status.resultingBoard, turn + 1);
        return { resultingSlice, resultingMove: move };
    }
    public static tryMove(player: Player, move: TablutMove, board: number[][]): TablutLegalityStatus {
        display(TablutRules.VERBOSE, { TablutRules_tryMove: { player, move, board } });
        const validity: MGPValidation = this.getMoveValidity(player, move, board);
        if (validity.isFailure()) {
            return { legal: validity, resultingBoard: null };
        }

        // move is legal here
        const depart: Coord = move.coord;
        const arrival: Coord = move.end;
        board[arrival.y][arrival.x] = board[depart.y][depart.x]; // dédoublement
        board[depart.y][depart.x] = TablutCase.UNOCCUPIED.value; // suppression du précédent
        let captured: Coord;
        for (const d of Orthogonal.ORTHOGONALS) {
            captured = this.tryCapture(player, move.end, d, board);
            if (captured != null) {
                board[captured.y][captured.x] = TablutCase.UNOCCUPIED.value; // do capture, unless if king
            }
        }
        return { legal: MGPValidation.SUCCESS, resultingBoard: board };
    }
    private static getMoveValidity(player: Player, move: TablutMove, board: number[][]): MGPValidation {
        const cOwner: RelativePlayer = this.getRelativeOwner(player, move.coord, board);
        if (cOwner === RelativePlayer.NONE) {
            return MGPValidation.failure('pawn coord unoccupied');
        }
        if (cOwner === RelativePlayer.ENNEMY) { // TODO OwnerEnum/Type
            return MGPValidation.failure('moving opponent piece');
        }

        const landingCoordOwner: RelativePlayer = this.getRelativeOwner(player, move.end, board);
        if (landingCoordOwner !== RelativePlayer.NONE) {
            return MGPValidation.failure('landing on occupied case');
        }
        if (this.isThrone(move.end)) {
            if (this.isKing(board[move.coord.y][move.coord.x])) {
                if (this.isCentralThrone(move.end) && this.CASTLE_IS_LEFT_FOR_GOOD) {
                    return MGPValidation.failure('castle is left for good');
                }
            } else {
                return MGPValidation.failure('Les soldats n\'ont pas le droit de se poser sur le throne.');
            }
        }

        const dir: Direction = move.coord.getDirectionToward(move.end);

        const dist: number = move.coord.getOrthogonalDistance(move.end);
        let c: Coord = move.coord.getNext(dir); // the inspected coord
        for (let i = 1; i < dist; i++) {
            if (board[c.y][c.x] !== TablutCase.UNOCCUPIED.value) {
                return MGPValidation.failure('something in the way');
            }
            c = c.getNext(dir);
        }
        return MGPValidation.SUCCESS;
    }
    private static tryCapture(player: Player, landingPawn: Coord, d: Orthogonal, board: number[][]): Coord {
        const LOCAL_VERBOSE: boolean = false;
        /* landingPawn is the piece that just moved
         * d the direction in witch we look for capture
         * return the captured coord, or null if no capture possible
         * 1. the threatened case dont exist         -> no capture
         * 2: the threatened case is not an ennemy   -> no capture
         * 3: the threatened case is a king -> delegate calculation
         * 4: the threatened case is a pawn -> delegate calculation
         */
        const threatened: Coord = landingPawn.getNext(d);
        if (!threatened.isInRange(TablutRulesConfig.WIDTH, TablutRulesConfig.WIDTH)) {
            return null; // 1: the threatened case dont exist, no capture
        }
        const threatenedPawnOwner: RelativePlayer = this.getRelativeOwner(player, threatened, board);
        if (threatenedPawnOwner !== RelativePlayer.ENNEMY) {
            return null; // 2: the threatened case is not an ennemy
        }
        if (this.isKing(board[threatened.y][threatened.x])) {
            return this.captureKing(player, landingPawn, d, board);
        }
        return this.capturePawn(player, landingPawn, d, board);
    }
    private static isKing(piece: number): boolean {
        return (piece === TablutCase.PLAYER_ZERO_KING.value) ||
               (piece === TablutCase.PLAYER_ONE_KING.value);
    }
    private static captureKing(player: Player, landingPiece: Coord, d: Orthogonal, board: number[][]): Coord {
        /* the king is the next coord after c (in direction d)
         * the landingPiece partipate in the capture
         *
         *  1: allied is out-of-range
         *      2: if two other are invaders AND LEGAL                  -> capture king (1 border + 3 invaders)
         *      3: if one invaders and one empty throne
         *          3.1: if king capturable by empty-throne and borders -> capture king (1 border, 1 throne, 2 invaders)
         *  4: back is empty
         *      5: if back is not a throne                              -> no capture
         *      here, back is an empty throne
         *      6: if king not capturable by empty throne               -> no capture
         *      7: if king capturable by 2                              -> capture king (1 invader + throne)
         *      8: else if two-other-coord are invader                  -> capture king (3 invaders + throne)
         *  9: allied is an invader
         *     10: if king is capturable by two                         -> capture king (2 invaders)
         *     11: if 2 others around king are invaders                 -> capture king (4 invaders)
         * So these are the different victory way for the invaders :
         * - 2 invaders
         * - 1 invaders 1 empty-throne
         * - 3 invaders 1 throne
         * - 2 invaders 1 throne 1 border
         * - 3 invaders 1 border
         * - 4 invaders
         */
        const LOCAL_VERBOSE = false;
        const kingCoord: Coord = landingPiece.getNext(d);

        const {
            backCoord, back, backInRange,
            leftCoord, left,
            rightCoord, right,
        } = this.getSurroundings(kingCoord, d, player, board);

        if (!backInRange) { // ///////////////////// 1
            let nbInvaders: number = (left === RelativePlayer.PLAYER ? 1 : 0);
            nbInvaders += (right === RelativePlayer.PLAYER ? 1 : 0);
            if (nbInvaders === 2 && this.THREE_INVADER_AND_A_BORDER_CAN_CAPTURE_KING) { // 2
                // king captured by 3 invaders against 1 border
                display(TablutRules.VERBOSE || LOCAL_VERBOSE, 'king captured by 3 invaders against 1 border');
                return kingCoord;
            } else if (nbInvaders === 1) {
                if (this.isEmptyThrone(leftCoord, board) ||
                    this.isEmptyThrone(rightCoord, board)) {
                    if (this.CAPTURE_KING_AGAINST_THRONE_RULES) { // ////////////////////// 3
                        // king captured by 1 border, 1 throne, 2 invaders
                        display(TablutRules.VERBOSE || LOCAL_VERBOSE, 'king captured by 2 invaders against 1 corner and 1 border');
                        return kingCoord;
                    }
                }
            }
            // those were the only two way to capture against the border
            return null;
        }
        if (back === RelativePlayer.NONE) { // ////////////////////////////////////////////////////// 4
            if (!this.isThrone(backCoord)) { // /////////////////////////////////////////// 5
                return null;
            } // here, back is an empty throne
            if (!this.CAPTURE_KING_AGAINST_THRONE_RULES) { // ///////////////////////////// 6
                return null;
            } // here king is capturable by this empty throne
            if (this.NORMAL_CAPTURE_WORK_ON_THE_KING) { // //////////////////////////////// 7
                display(TablutRules.VERBOSE || LOCAL_VERBOSE, 'king captured by 1 invader and 1 throne');
                return kingCoord; // king captured by 1 invader and 1 throne
            }
            if (left === RelativePlayer.PLAYER && right === RelativePlayer.PLAYER) {
                display(TablutRules.VERBOSE || LOCAL_VERBOSE, 'king captured by 3 invaders + 1 throne');
                return kingCoord; // king captured by 3 invaders + 1 throne
            }
        }
        if (back === RelativePlayer.PLAYER) {
            if (this.NORMAL_CAPTURE_WORK_ON_THE_KING) {
                display(TablutRules.VERBOSE || LOCAL_VERBOSE, 'king captured by two invaders');
                return kingCoord; // king captured by two invaders
            }
            if (left === RelativePlayer.PLAYER && right === RelativePlayer.PLAYER) {
                display(TablutRules.VERBOSE || LOCAL_VERBOSE, 'king captured by 4 invaders');
                return kingCoord; // king captured by 4 invaders
            }
        }
        return null;
    }
    public static getSurroundings(c: Coord, d: Direction, player: Player, board: number[][]) {
        const backCoord: Coord = c.getNext(d); // the piece that just move came from the front direction (by definition)
        const backInRange: boolean = backCoord.isInRange(TablutRulesConfig.WIDTH, TablutRulesConfig.WIDTH);
        const back: RelativePlayer = backInRange ?
            this.getRelativeOwner(player, backCoord, board) :
            RelativePlayer.NONE;

        const leftCoord: Coord = c.getLeft(d);
        const leftInRange: boolean = leftCoord.isInRange(TablutRulesConfig.WIDTH, TablutRulesConfig.WIDTH);
        const left: RelativePlayer = leftInRange ?
            this.getRelativeOwner(player, leftCoord, board) :
            RelativePlayer.NONE;

        const rightCoord: Coord = c.getRight(d);
        const rightInRange: boolean = rightCoord.isInRange(TablutRulesConfig.WIDTH, TablutRulesConfig.WIDTH);
        const right: RelativePlayer = rightInRange ?
            this.getRelativeOwner(player, rightCoord, board) :
            RelativePlayer.NONE;
        return {
            backCoord, back, backInRange,
            leftCoord, left,
            rightCoord, right,
        };
    }
    private static capturePawn(player: Player, c: Coord, d: Orthogonal, board: number[][]): Coord {
        /* the pawn is the next coord after c (in direction d)
         * c partipate in the capture
         *
         * So these are the different capture ways :
         * - 2 ennemies
         * - 1 ennemies 1 empty-throne
         */
        const LOCAL_VERBOSE = false;

        const threatenedPieceCoord: Coord = c.getNext(d);

        const backCoord: Coord = threatenedPieceCoord.getNext(d);
        // the piece that just move is always considered in front
        if (!backCoord.isInRange(TablutRulesConfig.WIDTH, TablutRulesConfig.WIDTH)) {
            display(TablutRules.VERBOSE || LOCAL_VERBOSE,
                'cannot capture a pawn against a wall; ' + threatenedPieceCoord + 'threatened by ' + player + '\'s pawn in  ' + c +
                ' coming from this direction (' + d.x + ', ' + d.y + ')');
            return null; // no ally no sandwich (against pawn)
        }

        const back: RelativePlayer = this.getRelativeOwner(player, backCoord, board);
        if (back === RelativePlayer.NONE) {
            if (!this.isThrone(backCoord)) {
                display(TablutRules.VERBOSE || LOCAL_VERBOSE,
                    'cannot capture a pawn without an ally; ' + threatenedPieceCoord + 'threatened by ' + player + '\'s pawn in  ' + c +
                    ' coming from this direction (' + d.x + ', ' + d.y + ')' +
                    'cannot capture a pawn without an ally behind');
                return null;
            } // here, back is an empty throne
            if (this.CAPTURE_PAWN_AGAINST_THRONE_RULES) {
                display(TablutRules.VERBOSE || LOCAL_VERBOSE,
                    'pawn captured by 1 ennemy and 1 throne; ' + threatenedPieceCoord + 'threatened by ' + player + '\'s pawn in  ' + c +
                    ' coming from this direction (' + d.x + ', ' + d.y + ')');
                return threatenedPieceCoord; // pawn captured by 1 ennemy and 1 throne
            }
        }
        if (back === RelativePlayer.PLAYER) {
            display(TablutRules.VERBOSE || LOCAL_VERBOSE,
                'pawn captured by 2 ennemies; ' + threatenedPieceCoord + 'threatened by ' + player + '\'s pawn in  ' + c +
                ' coming from this direction (' + d.x + ', ' + d.y + ')');
            return threatenedPieceCoord; // pawn captured by two ennemies
        }
        display(TablutRules.VERBOSE || LOCAL_VERBOSE,
            'no captures; ' + threatenedPieceCoord + 'threatened by ' + player + '\'s pawn in  ' + c +
            ' coming from this direction (' + d.x + ', ' + d.y + ')');
        return null;
    }
    private static isEmptyThrone(c: Coord, board: number[][]): boolean {
        if (this.isThrone(c)) {
            return board[c.y][c.x] === TablutCase.UNOCCUPIED.value;
        }
        return false;
    }
    public static isThrone(c: Coord): boolean {
        if (this.isExternalThrone(c)) {
            return true;
        } else {
            return this.isCentralThrone(c);
        }
    }
    private static isExternalThrone(c: Coord): boolean {
        const fin = TablutRulesConfig.WIDTH - 1;
        if (c.x === 0) {
            return (c.y === 0) || (c.y === fin);
        } else if (c.x === fin) {
            return (c.y === 0) || (c.y === fin);
        }
        return false;
    }
    private static isCentralThrone(c: Coord): boolean {
        let center: number = TablutRulesConfig.WIDTH / 2;
        center -= center % 2;
        return (c.x === center && c.y === center);
    }
    private static getAbsoluteOwner(c: Coord, board: NumberTable): Player {
        const caseC: number = board[c.y][c.x];
        let owner: Player;
        switch (caseC) {
        case TablutCase.PLAYER_ZERO_KING.value:
            owner = Player.ZERO;
            break;
        case TablutCase.PLAYER_ONE_KING.value:
            owner = Player.ONE;
            break;
        case TablutCase.INVADERS.value:
            owner = TablutPartSlice.INVADER_START ? Player.ZERO : Player.ONE;
            break;
        case TablutCase.DEFENDERS.value:
            owner = TablutPartSlice.INVADER_START ? Player.ONE : Player.ZERO;
            break;
        case TablutCase.UNOCCUPIED.value:
            owner = Player.NONE;
            break;
        default:
            throw new Error('Invalid value on the board');
        }
        return owner;
    }
    public static getRelativeOwner(player: Player, c: Coord, board: NumberTable): RelativePlayer {
        const caseC: number = board[c.y][c.x];
        const owner: Player = this.getAbsoluteOwner(c, board);
        let relativeOwner: RelativePlayer;
        if (owner === Player.NONE) {
            relativeOwner = RelativePlayer.NONE;
        } else if (player === owner) {
            relativeOwner = RelativePlayer.PLAYER;
        } else {
            relativeOwner = RelativePlayer.ENNEMY;
        }
        // TESTS
        if (caseC === TablutCase.UNOCCUPIED.value) {
            if (relativeOwner !== RelativePlayer.NONE) {
                display(TablutRules.VERBOSE, 'WTF, empty is on no one side but here is on ' + relativeOwner + ' :: ' + owner + ' :: ' + player);
            }
        } else if (player === Player.ZERO) {
            if (caseC === TablutCase.INVADERS.value) {
                if (TablutPartSlice.INVADER_START) {
                    if (relativeOwner !== RelativePlayer.PLAYER) {
                        display(TablutRules.VERBOSE,
                            'player start, invader start, case is invader, but player don\'t own the case ' +
                            relativeOwner + ' :: ' + owner + ' :: ' + player);
                    }
                } else {
                    if (relativeOwner !== RelativePlayer.ENNEMY) {
                        display(TablutRules.VERBOSE, 'player start, defender start, case is invader, but is not ennemy ??? ' +
                            relativeOwner + ' :: ' + owner + ' :: ' + player);
                    }
                }
            } else {
                // TODO
            }
        } else { // player follow
            if (TablutPartSlice.INVADER_START) {
                if (caseC === TablutCase.INVADERS.value) {
                    if (relativeOwner !== RelativePlayer.ENNEMY) {
                        display(TablutRules.VERBOSE, 'player follow, invader start, case is invader, but case is not ennemy ' +
                            relativeOwner + ' :: ' + owner + ' :: ' + player);
                    }
                }
            } else { // invader follow
                if (caseC === TablutCase.INVADERS.value) {
                    if (relativeOwner !== RelativePlayer.PLAYER) {
                        display(TablutRules.VERBOSE, 'player follow, invader follow, case is invader, but player don\t own it ??? ' +
                            relativeOwner + ' :: ' + owner + ' :: ' + player);
                    }
                } else {
                    // TODO
                }
            }
        }
        // FIN DE TESTS
        return relativeOwner;
    }
    public static getPossibleDestinations(depart: Coord, board: number[][]): Coord[] {
        // search the possible destinations for the pawn at "depart"
        const destinations: Coord[] = [];
        let foundDestination: Coord;
        for (const dir of Orthogonal.ORTHOGONALS) {
            // we look for empty existing destinations in each direction as far as we can
            foundDestination = depart.getNext(dir, 1);
            let obstacleFound: boolean = false;
            while (foundDestination.isInRange(TablutRulesConfig.WIDTH, TablutRulesConfig.WIDTH) &&
                   obstacleFound === false) {
                const destinationEmpty: boolean = this.getAbsoluteOwner(foundDestination, board) === Player.NONE;
                if (destinationEmpty) {
                    if (TablutRules.isThrone(foundDestination)) {
                        if (TablutRules.isKing(board[depart.y][depart.x])) {
                            destinations.push(foundDestination);
                        }
                    } else {
                        destinations.push(foundDestination);
                    }
                } else {
                    obstacleFound = true;
                }
                foundDestination = foundDestination.getNext(dir, 1);
            }
        }
        return destinations;
    }
    public static getKingCoord(board: number[][]): MGPOptional<Coord> {
        display(TablutRules.VERBOSE, { TablutRules_getKingCoord: { board } });

        for (let y: number = 0; y < TablutRulesConfig.WIDTH; y++) {
            for (let x: number = 0; x < TablutRulesConfig.WIDTH; x++) {
                if (this.isKing(board[y][x])) {
                    return MGPOptional.of(new Coord(x, y));
                }
            }
        }
        return MGPOptional.empty();
    }
    public static getInvaderVictoryValue(): number {
        display(TablutRules.VERBOSE, 'TablutRules.getInvaderVictoryValue');

        if (TablutPartSlice.INVADER_START) {
            return Number.MIN_SAFE_INTEGER;
        } else {
            return Number.MAX_SAFE_INTEGER;
        }
    }
    public static getDefenderVictoryValue(): number {
        if (TablutPartSlice.INVADER_START) {
            return Number.MAX_SAFE_INTEGER;
        } else {
            return Number.MIN_SAFE_INTEGER;
        }
    }
    public static isPlayerImmobilised(player: Player, board: number[][]): boolean {
        return this.getPlayerListMoves(player, board).length === 0;
    }
    public static getPlayerListPawns(player: Player, board: number[][]): Coord[] {
        const listPawn: Coord[] = [];
        let pawn: Coord;
        let owner: Player;
        for (let y = 0; y < TablutRulesConfig.WIDTH; y++) {
            for (let x = 0; x < TablutRulesConfig.WIDTH; x++) {
                // pour chaque case
                pawn = new Coord(x, y);
                owner = this.getAbsoluteOwner(pawn, board);
                if (owner === player) {
                    listPawn.push(pawn);
                }
            }
        }
        return listPawn;
    }
    public static getPlayerListMoves(player: Player, board: number[][]): TablutMove[] {
        const LOCAL_VERBOSE: boolean = false;
        const listMoves: TablutMove[] = [];
        const listPawns: Coord[] = this.getPlayerListPawns(player, board);
        display(TablutRules.VERBOSE || LOCAL_VERBOSE, { TablutRules_getPlayerListMoves: { player, board }});

        let pawnDestinations: Coord[];
        let newMove: TablutMove;
        for (const pawn of listPawns) {
            pawnDestinations = this.getPossibleDestinations(pawn, board);
            for (const destination of pawnDestinations) {
                newMove = new TablutMove(pawn, destination);
                listMoves.push(newMove);
            }
        }
        return listMoves;
    }
    // instance methods :

    public applyLegalMove(move: TablutMove, slice: TablutPartSlice, status: TablutLegalityStatus): { resultingMove: TablutMove; resultingSlice: TablutPartSlice; } {
        display(TablutRules.VERBOSE, { tablutRules_applyLegalMove: { move, slice, status } });
        return TablutRules.applyLegalMove(move, slice, status);
    }
    public getListMoves(node: TablutNode): MGPMap<TablutMove, TablutPartSlice> {
        const LOCAL_VERBOSE: boolean = false;
        display(TablutRules.VERBOSE || LOCAL_VERBOSE, { TablutRules_getListMoves: { node } });

        const listCombinaison: MGPMap<TablutMove, TablutPartSlice> = new MGPMap<TablutMove, TablutPartSlice>();

        const slice: TablutPartSlice = node.gamePartSlice;

        let currentBoard: number[][] = slice.getCopiedBoard();
        const currentPlayer: Player = slice.getCurrentPlayer();

        const listMoves: TablutMove[] =
            TablutRules.getPlayerListMoves(currentPlayer, currentBoard);
        display(TablutRules.VERBOSE || LOCAL_VERBOSE, { listMoves });

        const nextTurn: number = slice.turn + 1;

        for (const newMove of listMoves) {
            currentBoard = slice.getCopiedBoard();
            const status: TablutLegalityStatus = TablutRules.tryMove(currentPlayer, newMove, currentBoard);
            const newPartSlice: TablutPartSlice = new TablutPartSlice(status.resultingBoard, nextTurn);
            listCombinaison.set(newMove, newPartSlice);
        }
        return listCombinaison;
    }
    public getListMovesPruned(node: TablutNode): { key: TablutMove, value: TablutPartSlice }[] {
        // TODO: pear this method, make it smarter
        const slice: TablutPartSlice = node.gamePartSlice;
        const currentBoard: number[][] = slice.getCopiedBoard();
        let coord: Coord;
        let owner: RelativePlayer;
        const currentPlayer: Player = slice.getCurrentPlayer();
        for (let y = 0; y < TablutRulesConfig.WIDTH; y++) {
            for (let x = 0; x < TablutRulesConfig.WIDTH; x++) {
                // pour chaque case
                coord = new Coord(x, y);
                owner = TablutRules.getRelativeOwner(currentPlayer, coord, currentBoard);
                if (owner === RelativePlayer.PLAYER) {
                    // pour l'envahisseur :
                    //     if the king is capturable : the only choice is the capturing
                    //     if the king is close to escape:  the only choice are the blocking one
                    // pour les défenseurs :
                    //     if the king can win : the only choice is the winning
                    //     if king threatened : the only choice is to save him
                    //         a: by escape
                    //         b: by interceding
                    //         c: by killing the threatener
                }
            }
        }
        return null;
    }
    public getBoardValue(move: TablutMove, slice: TablutPartSlice): number {
        // 1. is the king escaped ?
        // 2. is the king captured ?
        // 3. is one player immobilised ?
        // 4. let's just for now just count the pawns
        const board: number[][] = slice.getCopiedBoard();

        const optionalKingCoord: MGPOptional<Coord> = TablutRules.getKingCoord(board);
        if (optionalKingCoord.isAbsent()) {
            // the king is dead, long live the king
            return TablutRules.getInvaderVictoryValue();
        }
        const kingCoord: Coord = optionalKingCoord.get();
        if (TablutRules.isExternalThrone(kingCoord)) {
            // king reached one corner !
            return TablutRules.getDefenderVictoryValue();
        }
        if (TablutRules.isPlayerImmobilised(Player.ZERO, board)) {
            return Number.MAX_SAFE_INTEGER;
        }
        if (TablutRules.isPlayerImmobilised(Player.ONE, board)) {
            return Number.MIN_SAFE_INTEGER;
        }
        const nbPlayerZeroPawns: number = TablutRules.getPlayerListPawns(Player.ZERO, board).length;
        const nbPlayerOnePawns: number = TablutRules.getPlayerListPawns(Player.ONE, board).length;
        const zeroMult: number = TablutPartSlice.INVADER_START ? 1 : 2; // invaders pawn are twice as numerous
        const oneMult: number = TablutPartSlice.INVADER_START ? 2 : 1; // so they're twice less valuable
        const scoreZero: number = nbPlayerZeroPawns * zeroMult;
        const scoreOne: number = nbPlayerOnePawns * oneMult;
        return scoreOne - scoreZero; // TODO : countInvader vs Defenders
    }
    public isLegal(move: TablutMove, slice: TablutPartSlice): TablutLegalityStatus {
        display(TablutRules.VERBOSE, { tablutRules_isLegal: { move, slice } });
        // copies
        const board: number[][] = slice.getCopiedBoard();

        // test
        const player: Player = slice.getCurrentPlayer();
        return TablutRules.tryMove(player, move, board);
    }
}
