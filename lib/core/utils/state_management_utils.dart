import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Standardized helpers for creating providers with consistent behavior.
class StateManagementUtils {
  StateManagementUtils._();

  static AsyncNotifierProvider<T, R> createAsyncNotifier<T extends AsyncNotifier<R>, R>(
      T Function() create) {
    return AsyncNotifierProvider<T, R>(create);
  }

  static NotifierProvider<T, R> createNotifier<T extends Notifier<R>, R>(T Function() create) {
    return NotifierProvider<T, R>(create);
  }
}

/// Base class for async notifiers that centralizes error handling patterns.
abstract class BaseAsyncNotifier<T> extends AsyncNotifier<T> {
  Future<void> handleError(Object error, StackTrace stackTrace) async {
    state = AsyncValue.error(error, stackTrace);
  }

  Future<R?> executeWithErrorHandling<R>(
    Future<R> Function() operation,
  ) async {
    try {
      return await operation();
    } catch (error, stackTrace) {
      await handleError(error, stackTrace);
      return null;
    }
  }

  void setLoading() {
    state = const AsyncValue.loading();
  }

  void setData(T data) {
    state = AsyncValue.data(data);
  }

  void setError(Object error, [StackTrace? stackTrace]) {
    state = AsyncValue.error(error, stackTrace ?? StackTrace.current);
  }
}

/// Base class for synchronous notifiers with shared error handling.
abstract class BaseNotifier<T> extends Notifier<T> {
  void handleError(Object error) {
    // Override in subclasses if needed.
  }

  R? executeWithErrorHandling<R>(R Function() operation) {
    try {
      return operation();
    } catch (error) {
      handleError(error);
      return null;
    }
  }

  void updateState(T newState) {
    state = newState;
  }
}

/// CRUD helper mixin for common list-based async notifiers.
mixin CrudOperationsMixin<T, ID> on BaseAsyncNotifier<List<T>> {
  Future<List<T>> onCreate(T item);
  Future<List<T>> onReadAll();
  Future<List<T>> onUpdate(ID id, T item);
  Future<List<T>> onDelete(ID id);
  Future<T?> onFindById(ID id);

  Future<void> createItem(T item) async {
    await executeWithErrorHandling<void>(() async {
      setLoading();
      final items = await onCreate(item);
      setData(items);
    });
  }

  Future<void> readAllItems() async {
    await executeWithErrorHandling<void>(() async {
      setLoading();
      final items = await onReadAll();
      setData(items);
    });
  }

  Future<void> updateItem(ID id, T item) async {
    await executeWithErrorHandling<void>(() async {
      setLoading();
      final items = await onUpdate(id, item);
      setData(items);
    });
  }

  Future<void> deleteItem(ID id) async {
    await executeWithErrorHandling<void>(() async {
      setLoading();
      final items = await onDelete(id);
      setData(items);
    });
  }

  Future<T?> findItemById(ID id) async {
    return executeWithErrorHandling<T?>(() => onFindById(id));
  }
}

/// Pagination helper mixin that keeps track of page/hasMore flags.
mixin PaginationMixin<T> on BaseAsyncNotifier<List<T>> {
  int _currentPage = 0;
  bool _hasMore = true;
  bool _isLoadingMore = false;

  int get currentPage => _currentPage;
  bool get hasMore => _hasMore;
  bool get isLoadingMore => _isLoadingMore;

  Future<List<T>> onLoadPage(int page);

  Future<void> loadFirstPage() async {
    resetPagination();
    await executeWithErrorHandling<void>(() async {
      setLoading();
      final items = await onLoadPage(0);
      setData(items);
      _hasMore = items.isNotEmpty;
    });
  }

  Future<void> loadNextPage() async {
    if (!_hasMore || _isLoadingMore) return;
    _isLoadingMore = true;
    try {
      await executeWithErrorHandling<void>(() async {
        final nextPage = _currentPage + 1;
        final items = await onLoadPage(nextPage);
        final existing = state.asData?.value ?? <T>[];
        setData([...existing, ...items]);
        _currentPage = nextPage;
        _hasMore = items.isNotEmpty;
      });
    } finally {
      _isLoadingMore = false;
    }
  }

  Future<void> refresh() async {
    await loadFirstPage();
  }

  void resetPagination() {
    _currentPage = 0;
    _hasMore = true;
    _isLoadingMore = false;
  }
}

/// Search utility mixin for async notifiers managing a list.
mixin SearchMixin<T> on BaseAsyncNotifier<List<T>> {
  String _searchQuery = '';
  List<T> _allItems = const [];

  String get searchQuery => _searchQuery;
  List<T> get allItems => _allItems;

  void setSearchQuery(String query) {
    _searchQuery = query;
    _filterItems();
  }

  bool matchesSearch(T item, String query);

  void updateAllItems(List<T> items) {
    _allItems = items;
    _filterItems();
  }

  void _filterItems() {
    if (_searchQuery.isEmpty) {
      setData(_allItems);
      return;
    }
    final filtered = _allItems.where((item) => matchesSearch(item, _searchQuery)).toList();
    setData(filtered);
  }
}

/// Sort utility mixin for async notifiers managing a list.
mixin SortMixin<T> on BaseAsyncNotifier<List<T>> {
  String _sortField = '';
  bool _sortAscending = true;

  String get sortField => _sortField;
  bool get sortAscending => _sortAscending;

  void setSort(String field, {bool ascending = true}) {
    _sortField = field;
    _sortAscending = ascending;
    _sortItems();
  }

  int compareItems(T a, T b, String field, bool ascending);

  void _sortItems() {
    // Guard against non-data states (loading/error)
    if (state.asData == null) {
      return;
    }

    final current = state.asData!.value;

    // Don't modify state if sort field is empty
    if (_sortField.isEmpty) {
      return;
    }

    final sorted = List<T>.from(current)
      ..sort((a, b) => compareItems(a, b, _sortField, _sortAscending));
    setData(sorted);
  }
}

/// Provider composition helpers.
class StateManagementHelpers {
  StateManagementHelpers._();

  static Provider<List<T>> createFilteredProvider<T>(
    Provider<List<T>> sourceProvider,
    Provider<String> filterProvider,
    bool Function(T item, String filter) filterFunction,
  ) {
    return Provider<List<T>>((ref) {
      final items = ref.watch(sourceProvider);
      final filter = ref.watch(filterProvider);
      if (filter.isEmpty) return items;
      return items.where((item) => filterFunction(item, filter)).toList();
    });
  }

  static Provider<List<T>> createSortedProvider<T>(
    Provider<List<T>> sourceProvider,
    Provider<String> sortFieldProvider,
    Provider<bool> sortAscendingProvider,
    int Function(T a, T b, String field, bool ascending) compareFunction,
  ) {
    return Provider<List<T>>((ref) {
      final items = ref.watch(sourceProvider);
      final sortField = ref.watch(sortFieldProvider);
      final sortAscending = ref.watch(sortAscendingProvider);
      if (sortField.isEmpty) return items;
      final sorted = List<T>.from(items)
        ..sort((a, b) => compareFunction(a, b, sortField, sortAscending));
      return sorted;
    });
  }
}

/// Extensions to safely interact with providers.
extension StateManagementExtension on WidgetRef {
  T? safeRead<T>(T Function(WidgetRef ref) readFn, {T? fallback}) {
    try {
      return readFn(this);
    } catch (_) {
      return fallback;
    }
  }

  T safeWatch<T>(T Function(WidgetRef ref) watchFn, {required T fallback}) {
    try {
      return watchFn(this);
    } catch (_) {
      return fallback;
    }
  }
}
