import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Route } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from '../material-modules';

import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule, AngularFirestore } from '@angular/fire/firestore';
import { AngularFireAuth } from '@angular/fire/auth';

import { firebaseConfig } from './firebaseConfig';

import { PartDAO } from './dao/part/PartDAO';

import { ChatService } from './services/chat/ChatService';
import { UserService } from './services/user/UserService';
import { AuthenticationService } from './services/authentication/AuthenticationService';
import { GameService } from './services/game/GameService';
import { JoinerService } from './services/joiner/JoinerService';

import { EmailVerified } from './guard/email-verified/EmailVerified';

import { AppComponent } from './app.component';
import { HeaderComponent } from './components/normal-component/header/header.component';
import { LoginComponent } from './components/normal-component/login-page/login.component';
import { ServerPageComponent } from './components/normal-component/server-page/server-page.component';
import { PartCreationComponent } from './components/normal-component/part-creation/part-creation.component';
import { ChatComponent } from './components/normal-component/chat/chat.component';
import { CountDownComponent } from './components/normal-component/count-down/count-down.component';
import { OnlineGameWrapperComponent } from './components/game-components/online-game-wrapper/online-game-wrapper.component';
import { LocalGameWrapperComponent } from './components/game-components/local-game-wrapper/local-game-wrapper.component';
import { GameIncluderComponent } from './components/game-components/game-includer/game-includer.component';
import { InscriptionComponent } from './components/normal-component/inscription/inscription.component';
import { ConfirmInscriptionComponent } from './components/normal-component/confirm-inscription/confirm-inscription.component';

import { AwaleComponent } from './components/game-components/awale/awale.component';
import { DvonnComponent } from './components/game-components/dvonn/dvonn.component';
import { EncapsuleComponent } from './components/game-components/encapsule/encapsule.component';
import { EpaminondasComponent } from './components/game-components/epaminondas/epaminondas.component';
import { GoComponent } from './components/game-components/go/go.component';
import { KamisadoComponent } from './components/game-components/kamisado/kamisado.component';
import { MinimaxTestingComponent } from './components/game-components/minimax-testing/minimax-testing.component';
import { P4Component } from './components/game-components/p4/p4.component';
import { PylosComponent } from './components/game-components/pylos/pylos.component';
import { QuartoComponent } from './components/game-components/quarto/quarto.component';
import { QuixoComponent } from './components/game-components/quixo/quixo.component';
import { ReversiComponent } from './components/game-components/reversi/reversi.component';
import { SaharaComponent } from './components/game-components/sahara/sahara.component';
import { SiamComponent } from './components/game-components/siam/siam.component';
import { TablutComponent } from './components/game-components/tablut/tablut.component';

export const INCLUDE_VERBOSE_LINE_IN_TEST = false;
// time scp -C -r ./dist/pantheonsgame/* gaviall@awesom.eu:/home/gaviall/www/pantheonsgame/

const routes: Route [] = [
    { path: 'login', component: LoginComponent },
    { path: 'server', component: ServerPageComponent },
    { path: 'inscription', component: InscriptionComponent },
    { path: 'confirm-inscription', component: ConfirmInscriptionComponent },

    { path: 'play/:compo/:id', component: OnlineGameWrapperComponent, canActivate: [EmailVerified] },
    { path: 'local/:compo', component: LocalGameWrapperComponent },
    { path: '', redirectTo: 'server', pathMatch: 'full' },
    { path: '**', component: ServerPageComponent },
];

@NgModule({
    declarations: [
        AppComponent,
        HeaderComponent,
        LoginComponent,
        ServerPageComponent,
        ChatComponent,
        PartCreationComponent,
        InscriptionComponent,
        CountDownComponent,
        OnlineGameWrapperComponent,
        GameIncluderComponent,
        LocalGameWrapperComponent,
        ConfirmInscriptionComponent,

        AwaleComponent,
        DvonnComponent,
        EncapsuleComponent,
        EpaminondasComponent,
        GoComponent,
        KamisadoComponent,
        MinimaxTestingComponent,
        P4Component,
        PylosComponent,
        QuartoComponent,
        QuixoComponent,
        ReversiComponent,
        SaharaComponent,
        SiamComponent,
        TablutComponent,
    ],
    entryComponents: [
        AwaleComponent,
        DvonnComponent,
        EncapsuleComponent,
        EpaminondasComponent,
        GoComponent,
        KamisadoComponent,
        MinimaxTestingComponent,
        P4Component,
        PylosComponent,
        QuartoComponent,
        QuixoComponent,
        ReversiComponent,
        SaharaComponent,
        SiamComponent,
        TablutComponent,

        CountDownComponent,
    ],
    imports: [
        BrowserModule,
        HttpClientModule,
        RouterModule.forRoot(routes, { useHash: true }),
        ReactiveFormsModule,
        FormsModule,
        AngularFireModule.initializeApp(firebaseConfig),
        AngularFirestoreModule,
        BrowserAnimationsModule,
        MaterialModule,
    ],
    providers: [
        AuthenticationService,
        GameService,
        JoinerService,
        UserService,
        ChatService,
        PartDAO,
        AngularFirestore,
        AngularFireAuth,
    ],
    bootstrap: [AppComponent],
})
export class AppModule { }
