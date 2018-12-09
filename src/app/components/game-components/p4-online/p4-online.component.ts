import {Component, OnInit} from '@angular/core';
import {P4Rules} from '../../../games/games.p4/P4Rules';
import {MoveX} from '../../../jscaip/MoveX';

import {AngularFirestore, AngularFirestoreDocument, DocumentReference} from 'angularfire2/firestore';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {ICurrentPart} from '../../../domain/icurrentpart';

import {GameInfoService} from '../../../services/game-info-service';
import {UserService} from '../../../services/user-service';
import {P4PartSlice} from '../../../games/games.p4/P4PartSlice';

@Component({
	selector: 'app-p4-online',
	templateUrl: './p4-online.component.html',
	styleUrls: ['./p4-online.component.css']
})
export class P4OnlineComponent implements OnInit {

	rules = new P4Rules();
	observerRole: number; // to see if the player is player zero (0) or one (1) or observatory (2)
	players: string[];
	board: Array<Array<number>>;

	imagesLocation = 'gaviall/pantheonsgame/assets/images/';

	imagesNames: string[] = ['empty_circle.svg', 'yellow_circle.svg.png', 'brown_circle.svg.png'];

	observedPart: Observable<ICurrentPart>;
	partDocument: AngularFirestoreDocument<ICurrentPart>;

	partId: string;
	userName: string;
	currentPlayer: string;
	turn = 0;
	endGame = false;
	winner: string;

	constructor(private afs: AngularFirestore,
				private gameInfoService: GameInfoService,
				private userService: UserService) {
	}

	ngOnInit() {
		// totally adaptable to other Rules
		// MNode.ruler = this.rules;

		// should be some kind of session-scope
		this.gameInfoService.currentPartId.subscribe(partId =>
			this.partId = partId);

		this.userService.currentUsername.subscribe(message =>
			this.userName = message);

		this.rules.setInitialBoard();
		this.board = this.rules.node.gamePartSlice.getCopiedBoard();

		this.observedPart = this.afs.collection('parties').doc(this.partId).snapshotChanges()
			.pipe(map(actions => {
				return actions.payload.data() as ICurrentPart;
			}));

		this.observedPart.subscribe(updatedICurrentPart => {
			console.log('Vous êtes dans la subscription');
			console.log('updatedICurrentPart.turn ' + updatedICurrentPart.turn);
			console.log('this.rules.node.gamePartSlice.turn ' + this.rules.node.gamePartSlice.turn);

			// todo : améliorer, ça ne doit pas être set à chaque fois
			this.players = [updatedICurrentPart.playerZero,
							updatedICurrentPart.playerOne];
			this.observerRole = 2;
			if (this.players[0] === this.userName) {
				this.observerRole = 0;
			} else if (this.players[1] === this.userName) {
				this.observerRole = 1;
			}
			if (updatedICurrentPart.result === 3) {
				this.endGame = true;
				this.winner = updatedICurrentPart.winner;
			}
			const listMoves = updatedICurrentPart.listMoves;
			const nbPlayedMoves = listMoves.length;
			let currentPartTurn;
			while (this.rules.node.gamePartSlice.turn < nbPlayedMoves) {
				P4Rules.debugPrintBiArray(this.rules.node.gamePartSlice.getCopiedBoard());
				currentPartTurn = this.rules.node.gamePartSlice.turn;
				const bol: boolean = this.rules.choose(MoveX.get(listMoves[currentPartTurn]));
			}
			this.updateBoard();
		});

		this.partDocument = this.afs.doc('parties/' + this.partId);
	}

	updateBoard() {
		const p4PartSlice: P4PartSlice = this.rules.node.gamePartSlice;
		this.board = p4PartSlice.getCopiedBoard();
		this.turn = p4PartSlice.turn;
		this.currentPlayer = this.players[p4PartSlice.turn % 2];
	}

	choose(event: MouseEvent): boolean {
		this.userService.updateUserActivity();
		if (this.isPlayerTurn()) {
			const x: number = Number(event.srcElement.id.substring(2, 3));
			console.log('vous tentez un mouvement en colonne ' + x);

			if (this.rules.node.isEndGame()) {
				console.log('Malheureusement la partie est finie');
				// todo : option de clonage revision commentage
				return false;
			}

			console.log('ça tente bien c\'est votre tour');
			// player's turn
			const choosedMove = MoveX.get(x);
			if (this.rules.choose(choosedMove)) {
				console.log('Et javascript estime que votre mouvement est légal');
				// player make a correct move
				// let's confirm on java-server-side that the move is legal
				this.updateDBBoard(choosedMove);
				if (this.rules.node.isEndGame()) {
					this.notifyVictory();
				}
			} else {
				console.log('Mais c\'est un mouvement illegal');
			}
		} else {
			console.log('Mais c\'est pas ton tour !');
		}
	}

	notifyVictory() {
		const victoriousPlayer = this.players[(this.rules.node.gamePartSlice.turn + 1) % 2];
		const docRef: DocumentReference = this.partDocument.ref;
		docRef.update({
			'winner': victoriousPlayer,
			'result': 3
		});
	}

	isPlayerTurn() {
		const indexPlayer = this.rules.node.gamePartSlice.turn % 2;
		return this.players[indexPlayer] === this.userName;
	}

	updateDBBoard(move: MoveX) {
		const docRef = this.partDocument.ref;
		docRef.get()
			.then((doc) => {
				const turn: number = doc.get('turn') + 1;
				const listMoves: number[] = doc.get('listMoves');
				listMoves[listMoves.length] = move.x;
				docRef.update({
					'listMoves': listMoves,
					'turn': turn
				});
			}).catch((error) => {
			console.log(error);
		});
	}

	debugPrintArray(b: Array<Array<number>>) {
		for (const line of b) {
			console.log(line);
		}
	}

	debugModifyArray(b: Array<number>) {
		b[3] = 5;
	}

	debugReassignArray(b: Array<number>) {
		b = [-1, -1, -1, -1, -73];
	}

}
