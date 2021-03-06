import { AngularFireAuth } from '@angular/fire/auth';
import { Injectable, OnDestroy } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/database';
import { Observable, BehaviorSubject, Subscription } from 'rxjs';

import { PIJoueur } from '../../domain/iuser';
import { environment } from 'src/environments/environment';

import { display } from 'src/app/utils/collection-lib/utils';

@Injectable()
export class AuthenticationService implements OnDestroy {
    public static VERBOSE = false;

    public static IN_TESTING = false;

    private authSub: Subscription;

    private joueurBS: BehaviorSubject<{pseudo: string, verified: boolean}> =
        new BehaviorSubject<{pseudo: string, verified: boolean}>({ pseudo: null, verified: null });

    private joueurObs: Observable<{pseudo: string, verified: boolean}> = this.joueurBS.asObservable();

    constructor(public afAuth: AngularFireAuth, private afs: AngularFirestore) {
        if (environment.test && !AuthenticationService.IN_TESTING) throw new Error('NO AUTH SERVICE IN TEST');

        display(AuthenticationService.VERBOSE, '1 authService subscribe to Obs<User>');
        this.authSub = this.afAuth.authState.subscribe((user: firebase.User) => {
            if (user == null) { // user logged out
                display(AuthenticationService.VERBOSE, '2.B: Obs<User> Sends null, logged out');
                this.joueurBS.next({ pseudo: null, verified: null });
            } else { // user logged in
                display(AuthenticationService.VERBOSE, '2.A: Obs<User> Sends ' + user.displayName + ', logged in');
                this.updatePresence();
                const pseudo: string = (user.displayName === '' || user.displayName == null) ? user.email : user.displayName;
                const verified: boolean = user.emailVerified;
                this.joueurBS.next({ pseudo, verified });
            }
        });
    }
    public async doEmailLogin(email: string, password: string): Promise<firebase.auth.UserCredential> {
        const userCredential: firebase.auth.UserCredential =
            await firebase.auth().signInWithEmailAndPassword(email, password);
        await this.updateUserDataAndGoToServer(userCredential.user);
        return userCredential;
    }
    public async doGoogleLogin(): Promise<firebase.auth.UserCredential> {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        const userCredential: firebase.auth.UserCredential =
            await this.afAuth.signInWithPopup(provider);
        await this.updateUserDataAndGoToServer(userCredential.user);
        return userCredential;
    }
    public async doRegister(value: {email: string, password: string}): Promise<firebase.auth.UserCredential> {
        const userCredential: firebase.auth.UserCredential = await firebase.auth().createUserWithEmailAndPassword(value.email, value.password);
        await this.updateUserDataAndGoToServer(userCredential.user);
        return userCredential;
    }
    private async updateUserDataAndGoToServer({ uid, email, displayName, emailVerified }: firebase.User): Promise<void> {
        // Sets user data to firestore on login
        const userRef: AngularFirestoreDocument<PIJoueur> = this.afs.doc(`joueurs/${uid}`);

        const data: PIJoueur = {
            email,
            displayName,
            pseudo: displayName || email,
            emailVerified,
        };

        return userRef.set(data, { merge: true });
    }
    public async disconnect(): Promise<void> {
        const uid: string = firebase.auth().currentUser.uid;
        const isOfflineForDatabase = {
            state: 'offline',
            last_changed: firebase.database.ServerValue.TIMESTAMP,
        };
        await firebase.database().ref('/status/' + uid).set(isOfflineForDatabase);
        return this.afAuth.signOut();
    }
    public getAuthenticatedUser(): {pseudo: string, verified: boolean} {
        return this.joueurBS.getValue();
    }
    public isUserLogged(): boolean {
        const joueur: { pseudo: string; verified: boolean; } = this.joueurBS.getValue();
        if (joueur == null) return false;
        if (joueur.pseudo == null) return false;
        if (joueur.pseudo == '') return false;
        if (joueur.pseudo == 'undefined') return false;
        if (joueur.pseudo == 'null') return false;
        return true;
    }
    private updatePresence() {
        const uid: string = firebase.auth().currentUser.uid;
        const userStatusDatabaseRef: firebase.database.Reference = firebase.database().ref('/status/' + uid);
        firebase.database().ref('.info/connected').on('value', function(snapshot) {
            if (snapshot.val() == false) {
                return;
            }
            const isOfflineForDatabase = {
                state: 'offline',
                last_changed: firebase.database.ServerValue.TIMESTAMP,
            };
            const isOnlineForDatabase = {
                state: 'online',
                last_changed: firebase.database.ServerValue.TIMESTAMP,
            };
            userStatusDatabaseRef.onDisconnect().set(isOfflineForDatabase).then(function() {
                userStatusDatabaseRef.set(isOnlineForDatabase);
            });
        });
    }
    public ngOnDestroy() {
        if (this.authSub) this.authSub.unsubscribe();
    }
    public getJoueurObs(): Observable<{pseudo: string, verified: boolean}> {
        return this.joueurObs;
    }
    public sendEmailVerification() {
        const user: firebase.User = firebase.auth().currentUser;
        if (!user) {
            throw new Error('Unlogged users can\'t send email verification');
        }
        if (user.emailVerified === true) {
            throw new Error('Verified users shouldn\'t ask twice email verification');
        } else {
            return user.sendEmailVerification();
        }
    }
}
