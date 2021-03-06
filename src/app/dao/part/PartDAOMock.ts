import { ICurrentPart, PICurrentPart, ICurrentPartId } from 'src/app/domain/icurrentpart';
import { FirebaseFirestoreDAOMock } from '../firebase-firestore-dao/FirebaseFirestoreDAOMock';
import { MGPStr } from 'src/app/utils/mgp-str/MGPStr';
import { ObservableSubject } from 'src/app/utils/collection-lib/ObservableSubject';
import { MGPMap } from 'src/app/utils/mgp-map/MGPMap';
import { FirebaseCollectionObserver } from '../FirebaseCollectionObserver';
import { display } from 'src/app/utils/collection-lib/utils';

type PartOS = ObservableSubject<ICurrentPartId>

export class PartDAOMock extends FirebaseFirestoreDAOMock<ICurrentPart, PICurrentPart> {
    public static VERBOSE = false;

    private static partDB: MGPMap<MGPStr, PartOS>;

    public constructor() {
        super('PartDAOMock', PartDAOMock.VERBOSE);
        display(this.VERBOSE || FirebaseFirestoreDAOMock.VERBOSE, 'PartDAOMock.constructor');
    }
    public getStaticDB(): MGPMap<MGPStr, PartOS> {
        return PartDAOMock.partDB;
    }
    public resetStaticDB() {
        PartDAOMock.partDB = new MGPMap();
    }
    public observeActivesParts(callback: FirebaseCollectionObserver<ICurrentPart>): () => void {
        return () => {}; // TODO, observingWhere should be coded!
    }
}
