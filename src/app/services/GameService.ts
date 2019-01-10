import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';

import {PartDAO} from '../dao/PartDAO';

import {ICurrentPart, ICurrentPartId} from '../domain/icurrentpart';
import {IJoiner, IJoinerId} from '../domain/ijoiner';

import {JoinerService} from './JoinerService';
import {Router} from '@angular/router';

@Injectable({
	providedIn: 'root'
})
export class GameService {

	private currentActivePart = new BehaviorSubject<ICurrentPartId[]>([]);
	currentActivePartObservable = this.currentActivePart.asObservable();

	private followedPartId: string;
	private followedPartObservable: Observable<ICurrentPart>;

	constructor(private route: Router,
				private partDao: PartDAO,
				private joinerService: JoinerService) {
	}

	observeAllActivePart() {
		const allActivesPartSub: () => void = this.partDao // TODO: utiliser pour se désabonner
			.observeAllActivePart(partIds => this.currentActivePart.next(partIds));
	}

	resign(partId: string, winner: string): Promise<void> {
		return this.partDao.updatePartById(partId, {
			winner: winner,
			result: 1
		}); // resign
	}

	notifyDraw(partId: string): Promise<void> {
		return this.partDao.updatePartById(partId, {
			result: 0
		}); // DRAW CONSTANT
	}

	notifyTimeout(partId: string, winner: string): Promise<void> {
		return this.partDao.updatePartById(partId, {
			winner: winner,
			result: 4
		});
	}

	notifyVictory(partId: string, winner: string): Promise<void> {
		return this.partDao.updatePartById(partId, {
			'winner': winner,
			'result': 3
		});
	}

	updateDBBoard(encodedMove: number, partId: string) {
		this.partDao.readPartById(partId)
			.then(part => {
				const turn: number = part.turn + 1;
				const listMoves: number[] = part.listMoves;
				listMoves[listMoves.length] = encodedMove;
				this.partDao.updatePartById(partId, {
					'listMoves': listMoves,
					'turn': turn
				});
			})
			.catch(error => console.log(error));
	}

	private startGameWithConfig(joiner: IJoiner): Promise<void> {
		let firstPlayer = joiner.creator;
		let secondPlayer = joiner.chosenPlayer;
		if (joiner.firstPlayer === '2' && (Math.random() < 0.5)) {
			joiner.firstPlayer = '1';
			// random
		}
		if (joiner.firstPlayer === '1') {
			// the opposite config is planned
			secondPlayer = joiner.creator;
			firstPlayer = joiner.chosenPlayer;
		}
		return this.partDao.updatePartById(this.followedPartId, {
			playerZero: firstPlayer,
			playerOne: secondPlayer,
			turn: 0,
			beginning: Date.now()
		});
	}

	joinGame(partId: string, userName: string): Promise<void> {
		console.log('GameService.joinGame ' + partId);
		const partPromise: Promise<ICurrentPart> = this.partDao.readPartById(partId);
		return partPromise.then(part =>
			this.joinerService.joinGame(part.playerZero, userName, partId));
	}

	createAndJoinGame(creatorName: string, typeGame: string) {
		console.log('GameService.createAndJoinGame');
		const newPart: ICurrentPart = {
			historic: 'pas implémenté',
			listMoves: [],
			playerZero: creatorName, // TODO: supprimer, il n'y a pas de createur par défaut
			playerOne: '',
			result: 5, // todo : constantiser ça, bordel
			scorePlayerZero: 'pas implémenté',
			scorePlayerOne: 'pas implémenté',
			turn: -1,
			typeGame: typeGame,
			typePart: 'pas implémenté',
			winner: ''
		};
		const newJoiner: IJoiner = {
			candidatesNames: [],
			creator: creatorName,
			chosenPlayer: '',
			timeoutMinimalDuration: 60,
			firstPlayer: '0', // par défaut: le créateur
			partStatus: 0 // en attente de tout, TODO: constantifier ça aussi !
		};
		this.partDao
			.createPart(newPart)
			.then(docId => {
				console.log('partDao.addPart fullfilled for ' + docId);
				this.joinerService
					.set(docId, newJoiner)
					.then(onfullfilled => {
						console.log('joinerService.set fullfilled for ' + docId);
						this.startObservingPart(docId);
						this.route.navigate(['/' + typeGame, docId]);
					})
					.catch(onrejected =>
						console.log('joinerService.set(' + docId + ', ' + JSON.stringify(newJoiner) + ') has failed'));
			});
	}

	proposeConfig(timeout: number, firstPlayer: string): Promise<void> {
		return this.joinerService.proposeConfig(timeout, firstPlayer);
	}

	cancelGame(): Promise<void> {
		console.log('GameService will cancel game ' + this.followedPartId);
		// cancel the currently observed game
		return this.joinerService
			.cancelGame()
			.then(onJoiningCancelled =>
				this.partDao
					.deletePartById(this.followedPartId)
					.then(onPartCancelled => this.stopObservingPart()));
	}

	acceptConfig(joiner: IJoiner): Promise<void> {
		this.startGameWithConfig(joiner);
		return this.joinerService.acceptConfig();
	}

	startObservingPart(docId: string) {
		if (this.followedPartId === docId) {
			console.log('partie ' + docId + 'déjà en cours d\'observation');
		} else if (this.followedPartId == null) {
			console.log('[ we start to observe ' + docId);
			this.followedPartId = docId;
			this.followedPartObservable = this.partDao.getPartObservableById(docId);
			this.joinerService.startObservingJoiner(docId);
		} else {
			alert('we were already observing ' + this.followedPartId + ' then you ask to watch' + docId + 'you are gross (no I\'m bugged)');
			this.stopObservingPart();
			this.startObservingPart(docId);
		}
	}

	stopObservingPart() {
		if (this.followedPartId == null) {
			console.log('no part to stop observing');
		} else {
			console.log('we stop observing ' + this.followedPartId + ']');
			this.joinerService.stopObservingJoiner();
			this.followedPartId = null;
			this.followedPartObservable = null;
		}
	}

	// DELEGATE

	getPartObservableById(partId: string): Observable<ICurrentPart> {
		return this.partDao.getPartObservableById(partId);
	}

	getJoinerIdObservable(): Observable<IJoinerId> {
		return this.joinerService.getJoinerIdObservable();
	}

	removePlayerFromJoiningPage(userName: string) {
		this.joinerService.removePlayerFromJoiningPage(userName);
	}

	setChosenPlayer(pseudo: string): Promise<void> {
		return this.joinerService.setChosenPlayer(pseudo);
	}

}