import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, of } from "rxjs";
import { tap, map, switchMap, catchError } from "rxjs/operators";
import { Album, Category } from "../models/album.model";
import { AlbumService } from "./album.service";
import { CategoryService } from "./category.service";

export interface AppState {
  albums: Album[];
  categories: Category[];
  isDataLoaded: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

@Injectable({
  providedIn: "root",
})
export class StateService {
  private stateSubject = new BehaviorSubject<AppState>({
    albums: [],
    categories: [],
    isDataLoaded: false,
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  public state$ = this.stateSubject.asObservable();

  constructor(
    private albumService: AlbumService,
    private categoryService: CategoryService,
  ) {
    // Load initial data if not already loaded
    if (!this.getCurrentState().isDataLoaded) {
      this.loadInitialData().subscribe();
    }
  }

  /**
   * Get Current State
   *
   * Returns the current snapshot of application state
   *
   * @return Current state object
   */
  getCurrentState(): AppState {
    return this.stateSubject.value;
  }

  /**
   * Get State
   *
   * Returns state as an observable
   *
   * @return State observable
   */
  getState(): Observable<AppState> {
    return this.state$;
  }

  /**
   * Load Initial Data
   *
   * Loads albums and categories on app initialization
   *
   * @return Loaded state
   */
  loadInitialData(): Observable<AppState> {
    // Return cached state if already loaded
    if (this.getCurrentState().isDataLoaded) {
      return of(this.getCurrentState());
    }

    // First load albums, then categories
    return this.albumService.getNewAlbums(1, 23).pipe(
      switchMap((response) => {
        const albums = response.results || [];
        const pagination = response.pagination || {
          page: 1,
          pages: 1,
          total: 0,
          limit: 23,
        };

        // Update state with albums
        this.updateState({
          albums,
          isDataLoaded: true,
          currentPage: pagination.page || 1,
          totalPages: pagination.pages || 1,
          totalItems: pagination.total || albums.length,
        });

        // Now fetch categories
        return this.categoryService.getCategories();
      }),
      map((categories) => {
        // Merge categories into existing state
        const newState = { ...this.getCurrentState(), categories };
        this.updateState(newState);
        return newState;
      }),
      catchError(() => {
        return of(this.getCurrentState());
      }),
    );
  }

  /**
   * Update State
   *
   * Merges partial state update with current state
   *
   * @param partial - Partial state to merge
   * @return void
   */
  private updateState(partial: Partial<AppState>): void {
    this.stateSubject.next({ ...this.getCurrentState(), ...partial });
  }
}