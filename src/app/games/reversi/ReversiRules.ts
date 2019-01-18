import {Rules} from '../../jscaip/Rules';
import {MoveCoord} from '../../jscaip/MoveCoord';
import {MNode} from '../../jscaip/MNode';
import {ReversiPartSlice} from './ReversiPartSlice';
import {Coord} from '../../jscaip/Coord';
import {DIRECTION, DIRECTIONS} from '../../jscaip/DIRECTION';

export class ReversiRules extends Rules {
	static readonly pass: MoveCoord = new MoveCoord(-1, 1);
	static readonly passNumber: number = -1;

	static getAllSwitcheds(move: MoveCoord, turn: number, board: number[][]): Coord[] {
		// try the move, do it if legal, and return the switched pieces
		const switcheds: Coord[] = [];
		let player: number = ReversiPartSlice.PLAYER_ZERO;
		let ennemy: number = ReversiPartSlice.PLAYER_ONE;
		if (turn % 2 === 1) {
			player = ReversiPartSlice.PLAYER_ONE;
			ennemy = ReversiPartSlice.PLAYER_ZERO;
		}
		// console.log(player + ' essaye de capturer');
		for (const direction of DIRECTIONS) {
			const firstCase: Coord = move.coord.getNext(direction);
			if (firstCase.isInRange(ReversiPartSlice.BOARD_WIDTH, ReversiPartSlice.BOARD_HEIGHT)) {
				if (board[firstCase.y][firstCase.x] === ennemy) {
					// let's test this direction
					const switchedInDir: Coord[] = ReversiRules.getSandwicheds(player, direction, firstCase, board);
					for (const switched of switchedInDir) {
						switcheds.push(switched);
					}
				}
			}
		}
		// console.log(move + ' : switched : ' + switcheds);
		return switcheds;
	}

	static getSandwicheds(capturer: number, direction: DIRECTION, start: Coord, board: number[][]): Coord[] {
		/* expected that 'start' is in range, and is captured
		 * if we don't reach another capturer, returns []
		 * else : return all the coord between start and the first 'capturer' found (exluded)
		 */

		const sandwichedsCoord = [start]; // here we know it in range and captured
		let testedCoord: Coord = start.getNext(direction);
		while (testedCoord.isInRange(ReversiPartSlice.BOARD_WIDTH, ReversiPartSlice.BOARD_HEIGHT)) {
			const testedCoordContent: number = board[testedCoord.y][testedCoord.x];
			if (testedCoordContent === capturer) {
				// we found a sandwicher, in range, in this direction
				return sandwichedsCoord;
			}
			if (testedCoordContent === ReversiPartSlice.UNOCCUPIED) {
				// we found the emptyness before a capturer, so there won't be a next case
				return [];
			} // we found a switched/captured
			sandwichedsCoord.push(testedCoord); // we add it
			testedCoord = testedCoord.getNext(direction); // next loop will observe the next
		}
		return []; // we found the end of the board before we found 	the newt pawn like 'searchedPawn'
	}

	static getCoordsBetween(direction: DIRECTION, first: Coord, end: Coord): Coord[] { // TODO: incorporer la GamePartSlice comme util?
		/* expected that both 'first' and 'sandwicher' are in range
		 * expected that 'sandwicher' is after 'first' in 'direction' 's direction
		 * return all the direction between 'first' and 'sandwicher', sandwicher excluded
		 * return an empty list if both coords are neighboors
		 */
		const coords: Coord[] = [];
		while (!first.equals(end)) {
			coords.push(first);
			first = first.getNext(direction);
		}
		return coords;
	}

	static isGameEnded(reversiPartSlice: ReversiPartSlice): boolean {
		return this.playerCanOnlyPass(reversiPartSlice)
			&& this.nextPlayerCantOnlyPass(reversiPartSlice);
	}

	static playerCanOnlyPass(reversiPartSlice: ReversiPartSlice): boolean {
		const currentPlayerChoices: { key: MoveCoord; value: ReversiPartSlice }[] = this.getListMoves(reversiPartSlice);
		// if the current player cannot play, then the part is ended
		return (currentPlayerChoices.length === 1) && currentPlayerChoices[0].key.equals(this.pass);
	}

	static nextPlayerCantOnlyPass(reversiPartSlice: ReversiPartSlice): boolean {
		const nextBoard: number[][] = reversiPartSlice.getCopiedBoard();
		const nextTurn: number = reversiPartSlice.turn + 1;
		const nextPartSlice: ReversiPartSlice = new ReversiPartSlice(nextBoard, nextTurn);
		return this.playerCanOnlyPass(nextPartSlice);
	}

	static getListMoves(reversiPartSlice: ReversiPartSlice): {'key': MoveCoord, 'value': ReversiPartSlice }[] {
		const listMoves: { 'key': MoveCoord, 'value': ReversiPartSlice }[] = [];

		let moveAppliedPartSlice: ReversiPartSlice;

		const board: number[][] = reversiPartSlice.getCopiedBoard();
		let nextBoard: number[][];
		const nextTurn: number = reversiPartSlice.turn + 1;

		const player = (nextTurn % 2 === 0) ? ReversiPartSlice.PLAYER_ONE : ReversiPartSlice.PLAYER_ZERO;
		const ennemy = (nextTurn % 2 === 0) ? ReversiPartSlice.PLAYER_ZERO : ReversiPartSlice.PLAYER_ONE;

		for (let y = 0; y < 8; y++) {
			for (let x = 0; x < 8; x++) {
				if (board[y][x] === ReversiPartSlice.UNOCCUPIED) {
					// For each empty cases
					nextBoard = reversiPartSlice.getCopiedBoard();
					const ennemyNeighboors = ReversiPartSlice.getNeighbooringPawnLike(nextBoard, ennemy, x, y);
					if (ennemyNeighboors.length > 0) {
						// if one of the 8 neighbooring case is an ennemy then, there could be a switch, and hence a legal move
						const move: MoveCoord = new MoveCoord(x, y);
						const result: Coord[] = ReversiRules.getAllSwitcheds(move, player, nextBoard);
						if (result.length > 0) {
							// there was switched piece and hence, a legal move
							for (const switched of result) {
								if (player === board[switched.y][switched.x]) {
									alert(switched + 'was already switched!');
								}
								nextBoard[switched.y][switched.x] = player;
							}
							nextBoard[y][x] = player;
							moveAppliedPartSlice = new ReversiPartSlice(nextBoard, nextTurn);
							listMoves.push({'key': move, 'value': moveAppliedPartSlice});
						}
					}
				}
			}
		}
		if (listMoves.length === 0) {
			// when the user cannot play, his only move is to pass, which he cannot do otherwise
			// board unchanged, only the turn changed "pass"
			// console.log('f91 The user can do nothing but pass at turn ' + (nextTurn - 1));
			moveAppliedPartSlice = new ReversiPartSlice(reversiPartSlice.getCopiedBoard(), nextTurn);
			listMoves.push({'key': ReversiRules.pass, 'value': moveAppliedPartSlice});
		}
		return listMoves;
	}

	choose(move: MoveCoord): boolean {
		let choix: MNode<ReversiRules>;
		/*if (this.node.hasMoves()) { // if calculation has already been done by the AI
			choix = this.node.getSonByMove(move); // let's not doing if twice
			if (choix != null) {
				this.node = choix; // qui devient le plateau actuel
				return true;
			}
		}*/
		const reversiPartSlice: ReversiPartSlice = this.node.gamePartSlice as ReversiPartSlice;
		const turn: number = this.node.gamePartSlice.turn;
		const player: number = turn % 2;
		const board: number[][] = reversiPartSlice.getCopiedBoard();
		if (move.equals(ReversiRules.pass)) { // if the player pass
			// let's check that pass is a legal move right now
			if (ReversiRules.playerCanOnlyPass(reversiPartSlice)) {
				// if he had no choice but to pass, then passing is legal !
				const sameBoardDifferentTurn: ReversiPartSlice =
					new ReversiPartSlice(board, turn + 1);
				choix = new MNode(this.node, move, sameBoardDifferentTurn);
				this.node = choix;
				return true;
			} // else, passing was illegal
			return false;
		}
		const switcheds = ReversiRules.getAllSwitcheds(move, turn, board);
		if (board[move.coord.y][move.coord.x] !== ReversiPartSlice.UNOCCUPIED) {
			return false;
		}
		if (switcheds.length === 0) {
			return false;
		} // else :
		// console.log(switcheds.length + ' retournés');
		for (const switched of switcheds) {
			if (player === board[switched.y][switched.x]) {
				alert(switched + 'was already switched!');
			}
			board[switched.y][switched.x] = player;
		}
		board[move.coord.y][move.coord.x] = player;
		const newPartSlice: ReversiPartSlice = new ReversiPartSlice(board, turn + 1);
		choix = new MNode(this.node, move, newPartSlice);
		this.node = choix;
		return true;
	}

	getBoardValue(n: MNode<ReversiRules>): number {
		const reversiPartSlice: ReversiPartSlice = n.gamePartSlice as ReversiPartSlice;
		const board: number[][] = n.gamePartSlice.getCopiedBoard();
		let player0Count = 0;
		let player1Count = 0;
		for (let y = 0; y < ReversiPartSlice.BOARD_HEIGHT; y++) {
			for (let x = 0; x < ReversiPartSlice.BOARD_WIDTH; x++) {
				if (board[y][x] === ReversiPartSlice.PLAYER_ZERO) {
					player0Count++;
				}
				if (board[y][x] === ReversiPartSlice.PLAYER_ONE) {
					player1Count++;
				}
			}
		}
		const diff: number = player1Count - player0Count;
		if (ReversiRules.isGameEnded(reversiPartSlice)) {
			if (diff < 0) { // player 0 won
				return Number.MIN_SAFE_INTEGER;
			}
			if (diff > 0) { // player 1 won
				return Number.MAX_SAFE_INTEGER;
			}
			// else : equality
		}
		return diff;
	}

	getListMoves(n: MNode<ReversiRules>): { key: MoveCoord; value: ReversiPartSlice }[] {
		return ReversiRules.getListMoves(n.gamePartSlice as ReversiPartSlice);
	}

	setInitialBoard(): void {
		if (this.node == null) {
			this.node = MNode.getFirstNode(
				new ReversiPartSlice(ReversiPartSlice.getStartingBoard(), 0),
				this
			);
		} else {
			this.node = this.node.getInitialNode();
		}
	}

}