import { Rules } from 'src/app/jscaip/Rules';
import { SiamMove } from '../siam-move/SiamMove';
import { SiamPartSlice } from '../SiamPartSlice';
import { MGPNode } from 'src/app/jscaip/mgp-node/MGPNode';
import { SiamPiece } from '../siam-piece/SiamPiece';
import { Player } from 'src/app/jscaip/player/Player';
import { Coord } from 'src/app/jscaip/coord/Coord';
import { Orthogonal, Direction } from 'src/app/jscaip/DIRECTION';
import { SiamLegalityStatus } from '../SiamLegalityStatus';
import { MGPMap } from 'src/app/utils/mgp-map/MGPMap';
import { MGPOptional } from 'src/app/utils/mgp-optional/MGPOptional';
import { MGPValidation } from 'src/app/utils/mgp-validation/MGPValidation';
import { display } from 'src/app/utils/collection-lib/utils';

abstract class _SiamRules extends Rules<SiamMove, SiamPartSlice, SiamLegalityStatus> {}

export abstract class SiamNode extends MGPNode<_SiamRules, SiamMove, SiamPartSlice, SiamLegalityStatus> {}

export class SiamRules extends _SiamRules {
    public static VERBOSE = false;

    public isLegal(move: SiamMove, slice: SiamPartSlice): SiamLegalityStatus {
        display(SiamRules.VERBOSE, { SiamRules_isLegal: { move, slice } });

        if (!move.isInsertion()) {
            const movedPiece: number = slice.getBoardAt(move.coord);
            if (!SiamPiece.belongTo(movedPiece, slice.getCurrentPlayer())) {
                return SiamLegalityStatus.failure('piece does not belong to current player');
            }
        }
        if (move.isRotation()) {
            display(SiamRules.VERBOSE, 'Move is rotation');
            return this.isLegalRotation(move, slice);
        } else {
            let movingPiece: number;
            if (move.isInsertion()) {
                display(SiamRules.VERBOSE, 'Move is insertion');
                const insertionInfo: {insertedPiece: number, legal: MGPValidation} =
                    this.isLegalInsertion(move.coord, slice);
                if (insertionInfo.legal.isFailure()) return { legal: insertionInfo.legal, resultingBoard: null };
                movingPiece = insertionInfo.insertedPiece;
            } else {
                display(SiamRules.VERBOSE, 'Move is forward');
                movingPiece = slice.getBoardAt(move.coord);
            }
            return this.isLegalForwarding(move, slice, movingPiece);
        }
    }
    public isLegalInsertion(coord: Coord, slice: SiamPartSlice): {insertedPiece: number, legal: MGPValidation} {
        const numberOnBoard: number = slice.countPlayerPawn();
        const currentPlayer: Player = slice.getCurrentPlayer();
        const legal: MGPValidation = (numberOnBoard < 5) ? MGPValidation.SUCCESS : MGPValidation.failure('all player pieces have been placed');
        const insertedPiece: number = SiamRules.getInsertedPiece(coord, currentPlayer).value;
        return { insertedPiece, legal };
    }
    public static getInsertedPiece(entrance: Coord, player: Player): SiamPiece {
        if (entrance.x === -1) return SiamPiece.of(Orthogonal.RIGHT, player);
        if (entrance.y === -1) return SiamPiece.of(Orthogonal.DOWN, player);
        if (entrance.x === 5) return SiamPiece.of(Orthogonal.LEFT, player);
        return SiamPiece.of(Orthogonal.UP, player);
    }
    public isLegalForwarding(move: SiamMove, slice: SiamPartSlice, firstPiece: number): SiamLegalityStatus {
        display(SiamRules.VERBOSE, { isLegalForwarding: { move: move.toString(), slice, firstPiece } });

        let movingPiece: number = SiamPiece.of(move.landingOrientation, slice.getCurrentPlayer()).value;
        const pushingDir: Orthogonal = move.moveDirection.get();
        let landingCoord: Coord = move.coord.getNext(pushingDir);
        if (landingCoord.isInRange(5, 5) &&
            slice.getBoardAt(landingCoord) !== SiamPiece.EMPTY.value &&
            SiamRules.isStraight(firstPiece, move) === false
        ) {
            display(SiamRules.VERBOSE, 'Illegal push because not straight or not pushing anything or leaving the board');
            return SiamLegalityStatus.failure('Illegal push because not straight or not pushing anything or leaving the board');
        }
        let currentDirection: Orthogonal = pushingDir;
        const resistingDir: Orthogonal = pushingDir.getOpposite();
        let totalForce = 0;
        const resultingBoard: number[][] = slice.getCopiedBoard();
        if (move.coord.isInRange(5, 5)) {
            resultingBoard[move.coord.y][move.coord.x] = SiamPiece.EMPTY.value;
        }
        let pushingPossible: boolean = landingCoord.isInRange(5, 5) &&
                                       movingPiece !== SiamPiece.EMPTY.value;

        while (pushingPossible) {
            if (pushingDir.equals(currentDirection)) {
                totalForce++;
            } else if (resistingDir.equals(currentDirection)) {
                totalForce--;
            }
            display(SiamRules.VERBOSE, { totalForce, movingPiece, landingCoord });
            const tmpPiece: number = resultingBoard[landingCoord.y][landingCoord.x];
            if (tmpPiece === SiamPiece.MOUNTAIN.value) totalForce -= 0.9;
            resultingBoard[landingCoord.y][landingCoord.x] = movingPiece;
            movingPiece = tmpPiece;
            landingCoord = landingCoord.getNext(pushingDir);
            currentDirection = SiamPiece.getNullableDirection(movingPiece);
            pushingPossible = landingCoord.isInRange(5, 5) &&
                              movingPiece !== SiamPiece.EMPTY.value &&
                              totalForce > 0;
        }
        if (landingCoord.isNotInRange(5, 5)) {
            display(SiamRules.VERBOSE, 'This movement would push ' + movingPiece + ' outside the board');

            if (pushingDir.equals(currentDirection)) {
                totalForce++;
            } else if (resistingDir.equals(currentDirection)) {
                totalForce--;
            }
        }
        if (totalForce <= 0) {
            display(SiamRules.VERBOSE, 'This move is an illegal push: ' + resultingBoard);
            return SiamLegalityStatus.failure('Move is an illegal push');
        }

        display(SiamRules.VERBOSE, 'This move is a legal push: '+resultingBoard);
        return { legal: MGPValidation.SUCCESS, resultingBoard };
    }
    public static isStraight(piece: number, move: SiamMove): boolean {
        const siamPiece: SiamPiece = SiamPiece.decode(piece);
        const pieceDirection: Orthogonal = siamPiece.getDirection();
        return (pieceDirection === move.moveDirection.getOrNull() &&
                pieceDirection === move.landingOrientation);
    }
    public isLegalRotation(rotation: SiamMove, slice: SiamPartSlice): SiamLegalityStatus {
        display(SiamRules.VERBOSE, { isLegalRotation: { rotation, slice } });

        const c: Coord = rotation.coord;
        const currentPiece: number = slice.getBoardAt(c);
        const currentPlayer: Player = slice.getCurrentPlayer();
        if (SiamPiece.getDirection(currentPiece) === rotation.landingOrientation) {
            return { legal: MGPValidation.failure('wrong rotation direction'), resultingBoard: null };
        }
        const resultingBoard: number[][] = slice.getCopiedBoard();
        resultingBoard[c.y][c.x] = SiamPiece.of(rotation.landingOrientation, currentPlayer).value;
        return { legal: MGPValidation.SUCCESS, resultingBoard };
    }
    public applyLegalMove(move: SiamMove, slice: SiamPartSlice, status: SiamLegalityStatus): { resultingMove: SiamMove; resultingSlice: SiamPartSlice} {
        const resultingMove: SiamMove = move;
        const newBoard: number[][] = status.resultingBoard;
        const newTurn: number = slice.turn + 1;
        const resultingSlice: SiamPartSlice = new SiamPartSlice(newBoard, newTurn);
        return { resultingMove, resultingSlice };
    }
    public getBoardValue(move: SiamMove, slice: SiamPartSlice): number {
        return this.getBoardValueInfo(move, slice).boardValue;
    }
    public getBoardValueInfo(move: SiamMove, slice: SiamPartSlice): { shortestZero: number, shortestOne: number, boardValue: number } {
        const mountainsInfo: { rows: number[], columns: number[], nbMountain: number } =
            this.getMountainsRowsAndColumns(slice);
        const mountainsRow: number[] = mountainsInfo.rows;
        const mountainsColumn: number[] = mountainsInfo.columns;

        const winner: Player = this.getWinner(slice, move, mountainsInfo.nbMountain);
        if (winner === Player.NONE) {
            const pushers: { distance: number, coord: Coord}[] =
                this.getPushers(slice, mountainsColumn, mountainsRow);
            let zeroShortestDistance: number = Number.MAX_SAFE_INTEGER;
            let oneShortestDistance: number = Number.MAX_SAFE_INTEGER;
            const currentPlayer: Player = slice.getCurrentPlayer();
            for (const pusher of pushers) {
                if (pusher.coord.isInRange(5, 5)) {
                    const piece: number = slice.getBoardAt(pusher.coord);
                    if (SiamPiece.belongTo(piece, Player.ZERO)) {
                        zeroShortestDistance = Math.min(zeroShortestDistance, pusher.distance);
                    } else {
                        oneShortestDistance = Math.min(oneShortestDistance, pusher.distance);
                    }
                } else {
                    if (currentPlayer === Player.ZERO) zeroShortestDistance = Math.min(zeroShortestDistance, pusher.distance);
                    else oneShortestDistance = Math.min(oneShortestDistance, pusher.distance);
                }
            }
            const boardValue: number = this.getScoreFromShortestDistances(zeroShortestDistance, oneShortestDistance, currentPlayer);
            return { shortestZero: zeroShortestDistance, shortestOne: oneShortestDistance, boardValue };
        } else {
            // 1. victories
            if (winner === Player.ZERO) {
                return {
                    shortestZero: 0,
                    shortestOne: Number.POSITIVE_INFINITY,
                    boardValue: Number.MIN_SAFE_INTEGER,
                };
            } else {
                return {
                    shortestZero: Number.POSITIVE_INFINITY,
                    shortestOne: 0,
                    boardValue: Number.MAX_SAFE_INTEGER,
                };
            }
        }
    }
    public getScoreFromShortestDistances(zeroShortestDistance: number, oneShortestDistance: number, currentPlayer: Player): number {
        if (zeroShortestDistance === Number.MAX_SAFE_INTEGER) zeroShortestDistance = 6;
        if (oneShortestDistance === Number.MAX_SAFE_INTEGER) oneShortestDistance = 6;
        const zeroScore: number = 6 - zeroShortestDistance;
        const oneScore: number = 6 - oneShortestDistance;
        if (zeroScore === oneScore) {
            if (currentPlayer === Player.ZERO) {
                return -1; // TODO think that correctly
            } else {
                return 1;
            }
        } else if (zeroScore > oneScore) {
            return (-10 * (zeroScore + 1)) + (oneScore + 1);
        } else {
            return (10 * (oneScore + 1)) - (zeroScore + 1);
        }
    }
    public getMountainsRowsAndColumns(slice: SiamPartSlice): { rows: number[], columns: number[], nbMountain: number } {
        const rows: number[] = [];
        const columns: number[] = [];
        let nbMountain = 0;
        for (let y=0; y<5; y++) {
            for (let x=0; x<5; x++) {
                if (slice.getBoardByXY(x, y) === SiamPiece.MOUNTAIN.value) {
                    if (!rows.includes(y)) rows.push(y);
                    if (!columns.includes(x)) columns.push(x);
                    nbMountain++;
                }
            }
        }
        return { rows, columns, nbMountain };
    }
    public getWinner(slice: SiamPartSlice, move: SiamMove, nbMountain: number): Player {
        if (nbMountain === 2) {
            return this.getPusher(slice, move);
        } else {
            return Player.NONE;
        }
    }
    public getPusher(slice: SiamPartSlice, finishingMove: SiamMove): Player {
        // here we will call the piece that started the move "moveStarter", obviously
        // and the piece in the right direction that was the closest to the falling mountain: the pusher

        const moveStarterCoord: Coord = finishingMove.coord;
        let moveStarterPiece: number;
        if (moveStarterCoord.isInRange(5, 5)) {
            const moveStarterDir: Direction = finishingMove.landingOrientation;
            moveStarterPiece = slice.getBoardAt(moveStarterCoord.getNext(moveStarterDir));
        } else { // insertion
            moveStarterPiece = SiamRules.getInsertedPiece(moveStarterCoord, slice.getCurrentEnnemy()).value;
        }
        const pushingDirection: Orthogonal = SiamPiece.getDirection(moveStarterPiece);
        const pusherCoord: Coord = this.getPusherCoord(slice, pushingDirection, moveStarterCoord);
        const winner: Player = SiamPiece.getOwner(slice.getBoardAt(pusherCoord));
        display(SiamRules.VERBOSE, moveStarterCoord.toString() + ' belong to ' + slice.getCurrentEnnemy().value + ', ' +
                pusherCoord.toString() + ' belong to ' + winner.value + ', ' + winner.value + ' win');
        return winner;
    }
    public getPusherCoord(slice: SiamPartSlice, pushingDirection: Orthogonal, pusher: Coord): Coord {
        let pushed: Coord = pusher.getNext(pushingDirection);
        let lastCorrectPusher: Coord = pusher;
        while (pushed.isInRange(5, 5)) {
            pusher = pushed;
            pushed = pushed.getNext(pushingDirection);
            const pushingPiece: SiamPiece = SiamPiece.decode(slice.getBoardAt(pusher));
            // TODO: test when mountain amongst the pushers
            if (pushingPiece !== SiamPiece.MOUNTAIN && pushingPiece.getDirection() === pushingDirection) {
                lastCorrectPusher = pusher;
            }
        }
        return lastCorrectPusher;
    }
    public getPushers(
        slice: SiamPartSlice,
        mountainsColumn: number[],
        mountainsRow: number[],
    ): { coord: Coord; distance: number; }[] {
        display(SiamRules.VERBOSE, { getPushers: { slice, mountainsColumn, mountainsRow } });
        let pushers: { coord: Coord; distance: number; }[] = [];
        const lineDirections: { direction: Orthogonal, fallingCoord: Coord}[] = [];
        for (const x of mountainsColumn) {
            let direction: Orthogonal = Orthogonal.DOWN;
            let fallingCoord: Coord = new Coord(x, 4);
            lineDirections.push({ direction, fallingCoord });

            direction = Orthogonal.UP;
            fallingCoord = new Coord(x, 0);
            lineDirections.push({ direction, fallingCoord });
        }
        for (const y of mountainsRow) {
            let direction: Orthogonal = Orthogonal.LEFT;
            let fallingCoord: Coord = new Coord(0, y);
            lineDirections.push({ direction, fallingCoord });

            direction = Orthogonal.RIGHT;
            fallingCoord = new Coord(4, y);
            lineDirections.push({ direction, fallingCoord });
        }
        for (const lineDirection of lineDirections) {
            const fallingCoord: Coord = lineDirection.fallingCoord;
            const direction: Orthogonal = lineDirection.direction;

            pushers = this.addPotentialDirectionPusher(slice, fallingCoord, direction, pushers);
        }
        return pushers;
    }
    public addPotentialDirectionPusher(
        slice: SiamPartSlice,
        fallingCoord: Coord,
        direction: Orthogonal,
        pushers: { coord: Coord, distance: number }[],
    ): { coord: Coord, distance: number }[] {
        const directionClosestPusher: MGPOptional<{ distance: number, coord: Coord }> =
            this.getLineClosestPusher(slice, fallingCoord, direction);
        if (directionClosestPusher.isAbsent()) {
            return pushers;
        }
        const pusher: { distance: number, coord: Coord } = directionClosestPusher.get();
        const distance: number = pusher.distance;
        display(SiamRules.VERBOSE, 'new closest challenger');
        const pusherCoord: Coord = pusher.coord;
        // find who own that pushing piece found
        let currentPusher: Player;
        if (pusherCoord.isInRange(5, 5)) {
            currentPusher = SiamPiece.getOwner(slice.getBoardAt(pusherCoord));
        } else {
            currentPusher = slice.getCurrentPlayer();
        }
        // const malus: number = slice.getCurrentPlayer() === currentPusher ? 0 : 1;
        pushers.push({
            coord: pusherCoord,
            distance, // : distance + malus
        });
        return pushers;
    }
    public getLineClosestPusher(
        slice: SiamPartSlice,
        fallingCoord: Coord,
        direction: Orthogonal)
        : MGPOptional<{ distance: number, coord: Coord }> {
        display(SiamRules.VERBOSE, { getDirectionClosestPusher: { slice, fallingCoord, direction: direction.toString() } });
        const resistance: Orthogonal = direction.getOpposite();
        let currentDistance = 1;
        let previousPiece: number = slice.getBoardAt(fallingCoord);
        let testedCoord: Coord = fallingCoord.getCopy();
        let weakPusher: Player = null;
        let almostPusher: Coord;
        let pusherFound = false;
        let mountainEncountered = false;
        let missingForce = 0;
        while (testedCoord.isInRange(5, 5) && pusherFound === false) {
            const currentPiece: number = slice.getBoardAt(testedCoord);
            display(SiamRules.VERBOSE, { testedCoord: testedCoord.toString(), currentDistance, currentPiece });
            if (SiamPiece.isEmptyOrMountain(currentPiece)) {
                if (currentPiece === SiamPiece.MOUNTAIN.value) {
                    display(SiamRules.VERBOSE, 'found mountain');
                    missingForce += 0.9;
                    mountainEncountered = true;
                } else { // Encountered empty case
                    display(SiamRules.VERBOSE, 'found empty place');
                    currentDistance++;
                }
            } else { // Player found
                const playerOrientation: Orthogonal = SiamPiece.getDirection(currentPiece);
                if (playerOrientation === direction) {
                    if (mountainEncountered) {
                        missingForce -= 1; // We count her as active pusher
                        // We found a piece pushing right in the good direction
                        if (missingForce > 0) { // But she can't push by herself
                            display(SiamRules.VERBOSE, 'found WEEAAK pushing player');
                            weakPusher = SiamPiece.getOwner(currentPiece);
                            // weakPusher are the one counsidered as winner in case of victory, whoever played
                        } else { // And she has enough force to push
                            display(SiamRules.VERBOSE, 'found STRRRONG pushing player at ' + testedCoord.toString());
                            pusherFound = true;
                            testedCoord = testedCoord.getNext(direction);
                        }
                    } else {
                        display(SiamRules.VERBOSE, 'found pushing player that might be pushed out before the mountain');
                    }
                } else if (playerOrientation === resistance) {
                    display(SiamRules.VERBOSE, 'found resisting player');
                    // We found a piece resisting the pushing direction
                    missingForce += 1;
                    if (!mountainEncountered) {
                        display(SiamRules.VERBOSE, 'he his before the mountain, we\'ll have to push longer');
                        currentDistance++;
                    }
                } else {
                    display(SiamRules.VERBOSE, 'found a sideway almost-pusher');
                    if (mountainEncountered) {
                        almostPusher = testedCoord.getCopy();
                        if (previousPiece !== SiamPiece.EMPTY.value) {
                            display(SiamRules.VERBOSE, 'his orientation will slow him down');
                            currentDistance++;
                        }
                    } else {
                        currentDistance++;
                        display(SiamRules.VERBOSE, 'he\'ll get pushed out before the mountain');
                    }
                }
            }
            // Still no player there, let's go back further
            previousPiece = currentPiece;
            testedCoord = testedCoord.getPrevious(direction);
        }
        display(SiamRules.VERBOSE, { testedCoord: testedCoord.toString(), loopResultingDistance: currentDistance });
        if (pusherFound === false && almostPusher != null) {
            currentDistance++;
            missingForce -= 1;
            display(SiamRules.VERBOSE, 'no pusher found but found one sideway guy');
            while (testedCoord.equals(almostPusher) === false) {
                display(SiamRules.VERBOSE, 'he was one piece backward');
                testedCoord = testedCoord.getNext(direction);
                currentDistance--;
            }
        }
        if (testedCoord.isNotInRange(5, 5)) {
            missingForce -= 1;
            display(SiamRules.VERBOSE, 'we end up out of the board');
            if (slice.countPlayerPawn() === 5) {
                display(SiamRules.VERBOSE, 'and we cannot insert');
                return MGPOptional.empty();
            }
        }
        if (missingForce > 0) {
            display(SiamRules.VERBOSE, 'we end up with not enough force to push');
            return MGPOptional.empty();
        }
        return MGPOptional.of({ distance: currentDistance, coord: testedCoord });
    }
    public getListMoves(node: SiamNode): MGPMap<SiamMove, SiamPartSlice> {
        const moves: MGPMap<SiamMove, SiamPartSlice> = new MGPMap<SiamMove, SiamPartSlice>();
        const turn: number = node.gamePartSlice.turn;
        const currentPlayer: Player = node.gamePartSlice.getCurrentPlayer();
        let c: number;
        let legality: SiamLegalityStatus;
        if (node.gamePartSlice.countPlayerPawn() < 5) {
            // up to 20 pushing insertion
            moves.putAll(this.getPushingInsertions(node));
            // up to 24 deraping insertion
            moves.putAll(this.getDerapingInsertions(node));
        }
        for (let y=0; y<5; y++) {
            for (let x=0; x<5; x++) {
                c = node.gamePartSlice.getBoardByXY(x, y);
                if (SiamPiece.belongTo(c, currentPlayer)) {
                    const currentOrientation: Orthogonal = SiamPiece.getDirection(c);
                    for (const direction of Orthogonal.ORTHOGONALS) {
                        // three rotation
                        if (direction !== currentOrientation) {
                            const newBoard: number[][] = node.gamePartSlice.getCopiedBoard();
                            const newMove: SiamMove = new SiamMove(x, y, MGPOptional.empty(), direction);
                            newBoard[y][x] = SiamPiece.of(direction, currentPlayer).value;
                            const newSlice: SiamPartSlice = new SiamPartSlice(newBoard, turn + 1);
                            moves.set(newMove, newSlice);
                        }

                        const landingCoord: Coord = new Coord(x + direction.x, y + direction.y);
                        let orientations: Orthogonal[];
                        if (landingCoord.isInRange(5, 5)) orientations = Orthogonal.ORTHOGONALS;
                        else orientations = [direction];

                        for (const orientation of orientations) {
                            const forwardMove: SiamMove = new SiamMove(x, y, MGPOptional.of(direction), orientation);
                            legality = this.isLegalForwarding(forwardMove, node.gamePartSlice, c);
                            if (legality.legal.isSuccess()) {
                                const forwardSlice: SiamPartSlice = new SiamPartSlice(legality.resultingBoard, turn + 1);
                                moves.set(forwardMove, forwardSlice);
                            }
                        }
                    }
                }
            }
        }
        display(SiamRules.VERBOSE, { getListMovesResult: moves });
        return moves;
    }
    public getPushingInsertions(node: SiamNode): MGPMap<SiamMove, SiamPartSlice> {
        const insertions: MGPMap<SiamMove, SiamPartSlice> = new MGPMap<SiamMove, SiamPartSlice>();
        const currentPlayer: Player = node.gamePartSlice.getCurrentPlayer();
        const newTurn: number = node.gamePartSlice.turn + 1;
        const newMoves: SiamMove[] = []; const insertedPieces: number[] = [];
        for (let xOrY=0; xOrY<5; xOrY++) {
            newMoves.push(new SiamMove(-1, xOrY, MGPOptional.of(Orthogonal.RIGHT), Orthogonal.RIGHT));
            insertedPieces.push(SiamPiece.of(Orthogonal.RIGHT, currentPlayer).value);
            newMoves.push(new SiamMove(5, xOrY, MGPOptional.of(Orthogonal.LEFT), Orthogonal.LEFT));
            insertedPieces.push(SiamPiece.of(Orthogonal.LEFT, currentPlayer).value);
            newMoves.push(new SiamMove(xOrY, -1, MGPOptional.of(Orthogonal.DOWN), Orthogonal.DOWN));
            insertedPieces.push(SiamPiece.of(Orthogonal.DOWN, currentPlayer).value);
            newMoves.push(new SiamMove(xOrY, 5, MGPOptional.of(Orthogonal.UP), Orthogonal.UP));
            insertedPieces.push(SiamPiece.of(Orthogonal.UP, currentPlayer).value);
        }
        let newSlice: SiamPartSlice; let legality: SiamLegalityStatus;
        for (let i = 0; i < newMoves.length; i++) {
            legality = this.isLegalForwarding(newMoves[i], node.gamePartSlice, insertedPieces[i]);
            if (legality.legal.isSuccess()) {
                newSlice = new SiamPartSlice(legality.resultingBoard, newTurn);
                insertions.set(newMoves[i], newSlice);
            }
        }
        return insertions;
    }
    public getDerapingInsertions(node: SiamNode): MGPMap<SiamMove, SiamPartSlice> {
        const insertions: MGPMap<SiamMove, SiamPartSlice> = new MGPMap<SiamMove, SiamPartSlice>();
        const currentPlayer: Player = node.gamePartSlice.getCurrentPlayer();
        const newTurn = node.gamePartSlice.turn + 1;
        let newMove: SiamMove; let insertedPiece: number; let newSlice: SiamPartSlice;
        let legality: SiamLegalityStatus;
        for (let y=1; y<=3; y++) {
            newMove = new SiamMove(-1, y, MGPOptional.of(Orthogonal.RIGHT), Orthogonal.UP);
            insertedPiece = SiamPiece.of(Orthogonal.UP, currentPlayer).value;
            legality = this.isLegalForwarding(newMove, node.gamePartSlice, insertedPiece);
            if (legality.legal.isSuccess()) {
                newSlice = new SiamPartSlice(legality.resultingBoard, newTurn);
                insertions.set(newMove, newSlice);

                // If this insertion is legal, then the same one in an opposite landing direction will be
                newMove = new SiamMove(-1, y, MGPOptional.of(Orthogonal.RIGHT), Orthogonal.DOWN);
                insertedPiece = SiamPiece.of(Orthogonal.DOWN, currentPlayer).value;
                legality = this.isLegalForwarding(newMove, node.gamePartSlice, insertedPiece);
                newSlice = new SiamPartSlice(legality.resultingBoard, newTurn);
                insertions.set(newMove, newSlice);
            }

            newMove = new SiamMove(5, y, MGPOptional.of(Orthogonal.LEFT), Orthogonal.UP);
            insertedPiece = SiamPiece.of(Orthogonal.UP, currentPlayer).value;
            legality = this.isLegalForwarding(newMove, node.gamePartSlice, insertedPiece);
            if (legality.legal.isSuccess()) {
                newSlice = new SiamPartSlice(legality.resultingBoard, newTurn);
                insertions.set(newMove, newSlice);

                // If this insertion is legal, then the same one in an opposite landing direction will be
                newMove = new SiamMove(5, y, MGPOptional.of(Orthogonal.LEFT), Orthogonal.DOWN);
                insertedPiece = SiamPiece.of(Orthogonal.DOWN, currentPlayer).value;
                legality = this.isLegalForwarding(newMove, node.gamePartSlice, insertedPiece);
                newSlice = new SiamPartSlice(legality.resultingBoard, newTurn);
                insertions.set(newMove, newSlice);
            }
        }
        for (let x=1; x<=3; x++) {
            newMove = new SiamMove(x, -1, MGPOptional.of(Orthogonal.DOWN), Orthogonal.LEFT);
            insertedPiece = SiamPiece.of(Orthogonal.LEFT, currentPlayer).value;
            legality = this.isLegalForwarding(newMove, node.gamePartSlice, insertedPiece);
            if (legality.legal.isSuccess()) {
                newSlice = new SiamPartSlice(legality.resultingBoard, newTurn);
                insertions.set(newMove, newSlice);

                // If this insertion is legal, then the same one in an opposite landing direction will be
                newMove = new SiamMove(x, -1, MGPOptional.of(Orthogonal.DOWN), Orthogonal.RIGHT);
                insertedPiece = SiamPiece.of(Orthogonal.RIGHT, currentPlayer).value;
                legality = this.isLegalForwarding(newMove, node.gamePartSlice, insertedPiece);
                newSlice = new SiamPartSlice(legality.resultingBoard, newTurn);
                insertions.set(newMove, newSlice);
            }

            newMove = new SiamMove(x, 5, MGPOptional.of(Orthogonal.UP), Orthogonal.LEFT);
            insertedPiece = SiamPiece.of(Orthogonal.LEFT, currentPlayer).value;
            legality = this.isLegalForwarding(newMove, node.gamePartSlice, insertedPiece);
            if (legality.legal.isSuccess()) {
                newSlice = new SiamPartSlice(legality.resultingBoard, newTurn);
                insertions.set(newMove, newSlice);

                // If this insertion is legal, then the same one in an opposite landing direction will be
                newMove = new SiamMove(x, 5, MGPOptional.of(Orthogonal.UP), Orthogonal.RIGHT);
                insertedPiece = SiamPiece.of(Orthogonal.RIGHT, currentPlayer).value;
                legality = this.isLegalForwarding(newMove, node.gamePartSlice, insertedPiece);
                newSlice = new SiamPartSlice(legality.resultingBoard, newTurn);
                insertions.set(newMove, newSlice);
            }
        }
        return insertions;
    }
    public static getCoordDirection(x: number, y: number, slice: SiamPartSlice): Orthogonal {
        const coord: Coord = new Coord(x, y);
        const insertedPiece: SiamPiece = this.getInsertedPiece(coord, slice.getCurrentPlayer());
        return insertedPiece.getDirection();
    }
}
