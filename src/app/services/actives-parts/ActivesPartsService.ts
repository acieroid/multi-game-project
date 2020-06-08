import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {PartDAO} from '../../dao/part/PartDAO';
import {ICurrentPartId, ICurrentPart} from '../../domain/icurrentpart';
import { FirebaseCollectionObserver } from '../../dao/FirebaseCollectionObserver';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ActivesPartsService {
    /* Actives Parts service
     * this service is used by the Server Component
     */

    public static IN_TESTING: boolean = false;

    private activesPartsBS = new BehaviorSubject<ICurrentPartId[]>([]);

    activesPartsObs = this.activesPartsBS.asObservable();

    private unsubscribe: () => void;

    constructor(private partDao: PartDAO) {
        if (environment.test && !ActivesPartsService.IN_TESTING) throw new Error("NO ACTIVE_PART SERVICE IN TEST");
    }
    public startObserving() {
        const partObserver: FirebaseCollectionObserver<ICurrentPart> = new FirebaseCollectionObserver();
        partObserver.onDocumentModified = (modifiedParts: ICurrentPartId[]) => {
            let result: ICurrentPartId[] = this.activesPartsBS.value;
            for (let p of modifiedParts) {
                result.forEach(part => {
                    if (part.id === p.id) part.doc = p.doc;
                });
            }
            this.activesPartsBS.next(result);
        };
        partObserver.onDocumentCreated = (createdParts: ICurrentPartId[]) => {
            const result: ICurrentPartId[] = this.activesPartsBS.value.concat(...createdParts);
            this.activesPartsBS.next(result);
        };
        partObserver.onDocumentDeleted = (deletedDocs: ICurrentPartId[]) => {
            let result: ICurrentPartId[] = [];
            let deletedIds: string[] = deletedDocs.map(doc => doc.id);
            for (let p of this.activesPartsBS.value) {
                if (!deletedIds.includes(p.id)) {
                    result.push(p);
                }
            }
            this.activesPartsBS.next(result);
        };
        this.unsubscribe = this.partDao.observeActivesParts(partObserver);
    }
    public stopObserving() {
        this.activesPartsBS.next([]);
        this.unsubscribe();
    }
}