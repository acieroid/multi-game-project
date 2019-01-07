import {Injectable} from '@angular/core';
import {AngularFirestore} from 'angularfire2/firestore';
import {IUser, IUserId, PIUser} from '../domain/iuser';

@Injectable({
	providedIn: 'root'
})
export class UserDAO {
	constructor(private afs: AngularFirestore) {}

	observeUserByPseudo(pseudo: string, callback: (user: IUserId) => void): () => void {
		// the callback will be called on the foundUser
		return this.afs.collection('joueurs').ref
			.where('pseudo', '==', pseudo)
			.limit(1)
			.onSnapshot(querySnapshot => {
				let userFound: IUserId;
				querySnapshot.forEach(doc => {
					const data = doc.data() as IUser;
					const id = doc.id;
					userFound = {id: id, user: data};
				});
				callback(userFound);
			});
	}

	observeAllActiveUser(callback: (users: IUserId[]) => void): () => void {
		return this.afs.collection('joueurs').ref
			.where('lastActionTime', '>=', Date.now() - (1000 * 60 * 10))
			.onSnapshot(querySnapshot => {
				const activeUserIds: IUserId[] = [];
				querySnapshot.forEach(doc => {
					const data = doc.data() as IUser;
					const id = doc.id;
					activeUserIds.push({id: id, user: data});
				});
				callback(activeUserIds);
			});
	}

	updateUserDocActivity(userDocId: string): Promise<void> {
		// update the user with pseudo to notifify that he's been doing something
		return this.afs.doc('joueurs/' + userDocId)
			.update({
				lastActionTime: Date.now(),
				status: -2 // TODO calculate what that must be
			});
	}

	// Simple CRUD

	createUser(newUser: IUser): Promise<string> {
		// returns the id of the created part
		return new Promise((resolve, reject) => {
			this.afs
				.collection('joueurs')
				.add(newUser)
				.then(docRef => resolve(docRef.id))
				.catch(onRejected => reject(onRejected));
		});
	}

	updateUserById(id: string, modification: PIUser): Promise<void> {
		return this.afs
			.doc('joueurs/' + id)
			.update(modification);
	}

}
