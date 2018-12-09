export interface ICurrentPart {
	typeGame: string;
	playerZero: string; // id
	playerOne?: string; // id
	turn: number; // -1 before it begin, 0 initial floor
	beginning?: number; // should be date; is a timestamp

	typePart?: number; // amicale, comptabilisée, pédagogique
	result?: number;
	/* draw = 0,
	 * resign = 1,
	 * escape = 2,
	 * victory = 3,
	 * timeout = 4,
	 * unachieved = 5 // todo : voir à mettre unachieved par défaut
	 */
	winner?: string; // joueur 1, joueur 2, null
	scorePlayerZero?: number;
	scorePlayerOne?: number;

	historic?: string; // id (null si non sauvegardée, id d’une Historique sinon) // l'historique est l'arbre en cas de take et retakes
	listMoves: number[]; // ONLY VALABLE FOR Number-encoded games
}

export interface ICurrentPartId {
	id: string;
	part: ICurrentPart;
}
