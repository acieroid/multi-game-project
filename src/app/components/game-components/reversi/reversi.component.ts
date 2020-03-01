import {Component} from '@angular/core';
import {AbstractGameComponent} from '../AbstractGameComponent';
import {ReversiRules} from '../../../games/reversi/ReversiRules';
import {ReversiPartSlice} from '../../../games/reversi/ReversiPartSlice';
import { ReversiMove } from 'src/app/games/reversi/ReversiMove';
import { ReversiLegalityStatus } from 'src/app/games/reversi/ReversiLegalityStatus';
import { Coord } from 'src/app/jscaip/Coord';

@Component({
    selector: 'app-reversi',
    templateUrl: './reversi.component.html'
})
export class ReversiComponent extends AbstractGameComponent<ReversiMove, ReversiPartSlice, ReversiLegalityStatus> {

    public VERBOSE: boolean = false;

    public rules = new ReversiRules();

    public lastMove: Coord = new Coord(-1, -1);

    public canPass = false;

    public onClick(x: number, y: number): boolean {
        const reversiPartSlice = this.rules.node.gamePartSlice;
        if (this.VERBOSE) {
            console.log('ReversiRules.getListMoves(reversiPartSlice): ');
            console.log(ReversiRules.getListMoves(reversiPartSlice));
            console.log('this.rules.getListMoves(this.rules.node): ');
            console.log(this.rules.getListMoves(this.rules.node));
            console.log('f9 0 board value : ' + this.rules.node.ownValue);
        }
        if (this.rules.node.isEndGame()) {
            if (this.VERBOSE) {
                console.log('Malheureusement la partie est finie');
            }
            return false;
        }

        if (this.VERBOSE) {
            console.log('vous tentez un mouvement en (' + x + ', ' + y + ')');
        }

        this.lastMove = new Coord(-1, -1); // now the user stop try to do a move
        // we stop showing him the last move
        const chosenMove = new ReversiMove(x, y);
        if (this.rules.isLegal(chosenMove)) {
            if (this.VERBOSE) {
                console.log('Et javascript estime que votre mouvement est légal');
            }
            // player make a correct move
            // let's confirm on java-server-side that the move is legal
            this.chooseMove(chosenMove, this.rules.node.gamePartSlice, null, null); // TODO: encode score
        } else {
            if (this.VERBOSE) {
                console.log('Mais c\'est un mouvement illegal');
            }
        }
    }
    public decodeMove(encodedMove: number): ReversiMove {
        return ReversiMove.decode(encodedMove);
    }
    public encodeMove(move: ReversiMove): number {
        return move.encode();
    }
    public updateBoard(): void {
        if (this.VERBOSE) {
            console.log('updateBoard');
        }
        const reversiPartSlice: ReversiPartSlice = this.rules.node.gamePartSlice;
        const moveCoord: ReversiMove = this.rules.node.move;

        this.board = reversiPartSlice.getCopiedBoard();

        if (moveCoord != null) {
            this.lastMove = moveCoord.coord;
        }
        if (this.VERBOSE) {
            console.log('f9 choices : ' + JSON.stringify(ReversiRules.getListMoves(reversiPartSlice)));
            console.log('f9 board value : ' + this.rules.node.ownValue);
        }
        if (ReversiRules.playerCanOnlyPass(reversiPartSlice)) { // && (!this.endGame)
            if (this.VERBOSE) {
                console.log('f9 l\'utilisateur ne peut que passer son tour!');
            }
            this.canPass = true;
        } else {
            if (this.VERBOSE) {
                console.log('f9 they pretend that you have choices, is it true');
            }
            this.canPass = false;
        }
    }
    public pass() {
        this.onClick(ReversiMove.pass.coord.x, ReversiMove.pass.coord.y);
    }
}