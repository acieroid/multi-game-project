import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/normal-component/header/header.component';
import { FooterComponent } from './components/normal-component/footer/footer.component';
import { HttpClientModule } from '@angular/common/http';
import { HttpModule } from '@angular/http';

import { RouterModule, Route} from '@angular/router';

import { LoginComponent } from './components/normal-component/login-page/login.component';
import { ServerPageComponent } from './components/normal-component/server-page/server-page.component';
import { StatisticPageComponent } from './components/normal-component/statistic-page/statistic-page.component';
import { CreateAccountComponent } from './components/normal-component/create-account/create-account.component';
import { P4OnlineComponent } from './components/game-components/p4-online/p4-online.component';
import { P4OfflineComponent } from './components/offline-components/p4-offline/p4-offline.component';

import { AngularFireModule } from 'angularfire2';
import { AngularFirestoreModule } from 'angularfire2/firestore';
import { IdPartService } from './services/id-part.service';

const firebaseConfig = {
  apiKey: 'AIzaSyAt5QHXLnm2Uf9X7VN6XPPiSaipoh3oRHo',
  authDomain: 'firestore-c9d47.firebaseapp.com',
  databaseURL: 'https://firestore-c9d47.firebaseio.com',
  projectId: 'firestore-c9d47',
  storageBucket: 'firestore-c9d47.appspot.com',
  messagingSenderId: '936588361631'
};

const routes: Route [] = [
  {path: 'server', 'component': ServerPageComponent},
  {path: 'statistic', 'component': StatisticPageComponent},
  {path: 'createAccount', 'component': CreateAccountComponent},
  {path: 'P4Online', 'component': P4OnlineComponent},
  {path: 'P4Offline', 'component': P4OfflineComponent},

  {path: '', redirectTo: 'login-page', pathMatch: 'full'},
  {path: '**', 'component': LoginComponent}
];

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    LoginComponent,
    P4OfflineComponent,
    ServerPageComponent,
    StatisticPageComponent,
    P4OfflineComponent,
    P4OnlineComponent,
    CreateAccountComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    HttpModule,
    RouterModule.forRoot(routes),
    ReactiveFormsModule,
    FormsModule,
    AngularFireModule.initializeApp(firebaseConfig),
    AngularFirestoreModule
  ],
  providers: [IdPartService],
  bootstrap: [AppComponent]
})
export class AppModule { }