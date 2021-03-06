import { ArrayUtils, NumberTable, Table } from 'src/app/utils/collection-lib/array-utils/ArrayUtils';
import { Coord } from '../coord/Coord';
import { Encoder } from '../encoder';

/** An hexagonal board encoding, following the description on this page: https://www.redblobgames.com/grids/hexagons/#map-storage */
export class HexaBoard<T> {
    public static empty<T>(radius: number, empty: T, encoder: Encoder<T>): HexaBoard<T> {
        return new HexaBoard(ArrayUtils.createBiArray(radius*2+1, radius*2+1, empty), radius, empty, encoder);
    }

    public static fromNumberTable<T>(table: NumberTable, empty: T, encoder: Encoder<T>): HexaBoard<T> {
        const contents: Table<T> = ArrayUtils.mapBiArray(table, encoder.decode);
        // TODO: could check that radius makes sense (e.g, contents.length is odd, contents[0].length is equal to contents.length
        return new HexaBoard(contents, (contents.length-1)/2, empty, encoder);
    }

    public static fromTable<T>(table: Table<T>, empty: T, encoder: Encoder<T>): HexaBoard<T> {
        // TODO: see above TODO
        return new HexaBoard(table, (table.length-1)/2, empty, encoder);
    }

    private constructor(public readonly contents: Table<T>,
                        public readonly radius: number,
                        public readonly empty: T,
                        public readonly encoder: Encoder<T>) {
    }
    public equals(other: HexaBoard<T>, equalT: (a: T, b: T) => boolean): boolean {
        if (this === other) return true;
        if (this.radius !== other.radius) return false;
        if (equalT(this.empty, other.empty) === false) return false;
        if (this.encoder !== other.encoder) return false;
        this.forEachCoord((coord: Coord, content: T) => {
            if (equalT(content, other.getAtUnsafe(coord)) === false) return false;
        });
        return true;
    }

    private getAtUnsafe(coord: Coord): T {
        return this.contents[coord.y+this.radius][coord.x+this.radius];
    }

    public getAt(coord: Coord): T {
        if (this.isOnBoard(coord)) {
            return this.getAtUnsafe(coord);
        } else {
            throw new Error('Accessing coord not on hexa board: ' + coord);
        }
    }

    public setAt(coord: Coord, v: T): HexaBoard<T> {
        const contents: T[][] = ArrayUtils.copyBiArray(this.contents);
        contents[coord.y+this.radius][coord.x+this.radius] = v;
        return new HexaBoard(contents, this.radius, this.empty, this.encoder);
    }

    public toNumberTable(): NumberTable {
        return ArrayUtils.mapBiArray(this.contents, this.encoder.encode);
    }

    public forEachCoord(callback: (coord: Coord, content: T) => void): void {
        const radius: number = this.radius;
        for (let q: number = -radius; q <= radius; q++) {
            const r1: number = Math.max(-radius, -q - radius);
            const r2: number = Math.min(radius, -q + radius);
            for (let r: number = r1; r <= r2; r++) {
                const coord: Coord = new Coord(q, r);
                callback(coord, this.getAt(coord));
            }
        }
    }

    public getAllBorders(): Coord[] {
        const coords: Coord[] = [];
        const radius: number = this.radius;
        for (let q: number = -radius; q <= radius; q++) {
            const r1: number = Math.max(-radius, -q - radius);
            const r2: number = Math.min(radius, -q + radius);
            coords.push(new Coord(q, r1));
            coords.push(new Coord(q, r2));
        }
        return coords;
    }

    public isOnBoard(coord: Coord): boolean {
        const q: number = coord.x;
        const radius: number = this.radius;
        if (q < - radius || q > radius) return false;

        const r1: number = Math.max(-radius, -q - radius);
        const r2: number = Math.min(radius, -q + radius);
        const r: number = coord.y;
        if (r < r1 || r > r2) return false;
        return true;
    }

    public isOnBorder(coord: Coord): boolean {
        return this.isOnTopRightBorder(coord) ||
            this.isOnRightBorder(coord) ||
            this.isOnBottomRightBorder(coord) ||
            this.isOnBottomLeftBorder(coord) ||
            this.isOnLeftBorder(coord) ||
            this.isOnLeftBorder(coord) ||
            this.isOnTopLeftBorder(coord);
    }

    public isOnTopRightBorder(coord: Coord): boolean {
        return coord.y === -this.radius;
    }
    public isOnRightBorder(coord: Coord): boolean {
        return coord.x === this.radius;
    }
    public isOnBottomRightBorder(coord: Coord): boolean {
        return this.axialToCubeYCoordinate(coord) === -this.radius;
    }
    public isOnBottomLeftBorder(coord: Coord): boolean {
        return coord.y === this.radius;
    }
    public isOnLeftBorder(coord: Coord): boolean {
        return coord.x === -this.radius;
    }
    public isOnTopLeftBorder(coord: Coord): boolean {
        return this.axialToCubeYCoordinate(coord) === this.radius;
    }
    private axialToCubeYCoordinate(coord: Coord): number {
        return -coord.x-coord.y;
    }

    public isTopLeftCorner(coord: Coord): boolean {
        return coord.x === -this.radius && coord.y === 0;
    }
    public isTopCorner(coord: Coord): boolean {
        return coord.x === 0 && coord.y === -this.radius;
    }
    public isTopRightCorner(coord: Coord): boolean {
        return coord.x === this.radius && coord.y === -this.radius;
    }
    public isBottomRightCorner(coord: Coord): boolean {
        return coord.x === this.radius && coord.y === 0;
    }
    public isBottomCorner(coord: Coord): boolean {
        return coord.x === 0 && coord.y === this.radius;
    }
    public isBottomLeftCorner(coord: Coord): boolean {
        return coord.x === -this.radius && coord.y === this.radius;
    }
}
