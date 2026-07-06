import { LightningElement, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAllQueryableObjects from '@salesforce/apex/QueryCraftController.getAllQueryableObjects';
import getQueryableFieldsForObject from '@salesforce/apex/QueryCraftController.getQueryableFieldsForObject';
import executeQuery from '@salesforce/apex/QueryCraftController.executeQuery';

export default class QueryCraft extends LightningElement {

    isLoading = true;
    allObjectsMasterList = [];
    @track filteredObjects = [];
    @track queryResults = [];
    @track columns = [];

    searchKey = '';
    searchTimeout;
    query = 'SELECT Id FROM Account LIMIT 10'; 
    objectName = 'Account';
    objectFields = [];

    sortField = null;
    sortDirection = 'asc';
    currentPage = 1;
    pageSize = 25;

    get connectionStatus() { return this.isLoading ? 'loading' : 'connected'; }
    get connectionLabel() { return this.isLoading ? 'Processing…' : 'Connected'; }

    get columnCount() { return this.columns ? this.columns.length : 0; }

    get sortedRows() {
        if (!this.sortField) return this.queryResults;
        const field = this.sortField;
        const dir = this.sortDirection === 'asc' ? 1 : -1;
        return [...this.queryResults].sort((a, b) => {
            const av = (a[field] ?? '').toString().toLowerCase();
            const bv = (b[field] ?? '').toString().toLowerCase();
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
        });
    }

    get paginatedRows() {
        const start = (this.currentPage - 1) * this.pageSize;
        const slice = this.sortedRows.slice(start, start + this.pageSize);
        return slice.map((row, i) => ({
            _rowIndex: start + i + 1,
            cells: this.columns.map(col => ({
                key: col.fieldName,
                value: this._formatValue(row[col.fieldName])
            }))
        }));
    }

    get totalPages() { return Math.max(1, Math.ceil(this.queryResults.length / this.pageSize)); }
    get pageStart() { return Math.min((this.currentPage - 1) * this.pageSize + 1, this.queryResults.length); }
    get pageEnd() { return Math.min(this.currentPage * this.pageSize, this.queryResults.length); }
    get isFirstPage() { return this.currentPage <= 1; }
    get isLastPage() { return this.currentPage >= this.totalPages; }

    connectedCallback() {
        this.loadDefaultFields();
    }

    async loadDefaultFields() {

        try {

            this.objectFields =
                await getQueryableFieldsForObject({
                    objectName: 'Account'
                });

        }
        catch (e) {

            this.objectFields = [];

        }
    }

    @wire(getAllQueryableObjects)
    wiredObjects({ error, data }) {
        if (data) {
            this.allObjectsMasterList = data;
            this.filteredObjects = data;
            this.isLoading = false;
        } else if (error) {
            this._toast('Connection Error', 'Could not load Salesforce objects.', 'error');
            this.isLoading = false;
        }
    }

    handleInputChange(event) {

        const searchTerm = event.target.value.toLowerCase().trim();

        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(() => {
            this.searchKey = searchTerm;

            this.filteredObjects =
                this.searchKey
                    ? this.allObjectsMasterList.filter(
                        obj => obj.toLowerCase().includes(this.searchKey)
                    )
                    : [...this.allObjectsMasterList];
        }, 300);

    }

    async handleObjectClick(event) {
        this.objectName = event.currentTarget.dataset.name;
        this._syncQuery(`SELECT Id FROM ${this.objectName} LIMIT 10`);
        this.queryResults = [];
        this.columns = [];
        this._resetPagination();
        await this.loadFieldsForObject(this.objectName);
    }

    async loadFieldsForObject(objName) {
        if (!objName) return;
        try {
            this.isLoading = true;
            this.objectFields = await getQueryableFieldsForObject({
                objectName: objName
            });
            // Sort fields alphabetically
            if (this.objectFields && this.objectFields.length) {
                this.objectFields = [...this.objectFields].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
            }
        } catch (error) {
            this.objectFields = [];
            this._toast(
                'Field Load Error',
                error?.body?.message || error.message,
                'error'
            );
        } finally {
            this.isLoading = false;
        }
    }

    handleQueryChange(event) {
        this.query = event.target.value;
        const cursorPosition = event.target.selectionStart;
        this._parseQueryForObject();
        this._sortFieldsBasedOnInput(cursorPosition);
    }

    _sortFieldsBasedOnInput(cursorPos) {
        if (!this.query || !this.objectFields || this.objectFields.length === 0) return;
        
        const textBeforeCursor = this.query.substring(0, cursorPos);
        const match = textBeforeCursor.match(/([a-zA-Z0-9_]+)[,\s]*$/);
        const currentWord = match ? match[1].toLowerCase() : '';
        
        const KEYWORDS = new Set(['select', 'from', 'where', 'limit', 'order', 'by', 'group', 'having', 'and', 'or', 'in', 'like', 'null', 'asc', 'desc']);
        
        if (currentWord && !KEYWORDS.has(currentWord)) {
            this.objectFields = [...this.objectFields].sort((a, b) => {
                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();
                const aStarts = aLower.startsWith(currentWord);
                const bStarts = bLower.startsWith(currentWord);
                const aIncludes = aLower.includes(currentWord);
                const bIncludes = bLower.includes(currentWord);
                
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                if (aIncludes && !bIncludes) return -1;
                if (!aIncludes && bIncludes) return 1;
                return aLower.localeCompare(bLower);
            });
        } else {
            this.objectFields = [...this.objectFields].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        }
    }

    _parseQueryForObject() {
        if (!this.query) return;
        const match = this.query.match(/\bfrom\s+([a-zA-Z0-9_]+)/i);
        if (match && match[1]) {
            const parsedObj = match[1];
            // Check if it's a valid object from our list
            const matchedObj = this.allObjectsMasterList.find(
                obj => obj.toLowerCase() === parsedObj.toLowerCase()
            );
            if (matchedObj && matchedObj !== this.objectName) {
                this.objectName = matchedObj;
                this.loadFieldsForObject(matchedObj);
            }
        }
    }

    handleExecuteClick() {
        const trimmed = (this.query || '').trim();
        if (!trimmed) {
            this._toast('Empty Query', 'Write a SOQL query before running.', 'warning');
            return;
        }
        this.isLoading = true;
        this.queryResults = [];
        this.columns = [];
        this._resetPagination();

        executeQuery({ query: trimmed })
            .then(result => {
                if (result && result.length > 0) {
                    this.queryResults = result;
                    this._buildColumns(result[0]);
                    this._toast('Success', `${result.length} record(s) returned.`, 'success');
                } else {
                    this._toast('No Data', 'Query ran — zero records matched.', 'info');
                }
            })
            .catch(error => {
                const msg = error?.body?.message || error?.message || 'Unknown error.';
                this._toast('Query Failed', msg, 'error');
            })
            .finally(() => { this.isLoading = false; });
    }

    handleFieldClick(event) {
        const field = event.currentTarget.dataset.name;
        if (!field) return;

        let q = (this.query || '').trim();

        if (!q) {
            this._syncQuery(`SELECT ${field} FROM ${this.objectName} LIMIT 10`);
            return;
        }

        const fromIdx = q.toUpperCase().lastIndexOf(' FROM ');

        if (fromIdx !== -1) {
            let selectSection = q.substring(0, fromIdx).trim();
            let fromSection = q.substring(fromIdx);

            const fieldsPart = selectSection.substring(6).trim();
            const existingFields = fieldsPart ? fieldsPart.split(',').map(f => f.trim().toUpperCase()) : [];
            
            if (existingFields.includes(field.toUpperCase())) {
                this._toast('Already Added', `"${field}" is already in your query.`, 'info');
                return;
            }

            if (selectSection.toUpperCase() === 'SELECT') {
                this._syncQuery(`SELECT ${field}${fromSection}`);
            } else {
                this._syncQuery(`${selectSection}, ${field}${fromSection}`);
            }
        } else {
            if (q.toUpperCase().includes(field.toUpperCase())) {
                this._toast('Already Added', `"${field}" is already in your query.`, 'info');
                return;
            }
            this._syncQuery(`SELECT Id, ${field} FROM ${this.objectName} LIMIT 10`);
        }
    }

    handleExportQuery() {
        if (!this.queryResults?.length) {
            this._toast('Nothing to Export', 'Run a query first to get data.', 'warning');
            return;
        }
        this.isLoading = true;
        setTimeout(() => {
            this._downloadCSV(this.sortedRows);
            this._toast('Exported', 'CSV download started.', 'success');
            this.isLoading = false;
        }, 300);
    }

    handleSort(event) {
        const field = event.currentTarget.dataset.field;
        if (!field) return;
        this.isLoading = true;

        setTimeout(() => {
            if (this.sortField === field) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortField = field;
                this.sortDirection = 'asc';
            }
            this.columns = this.columns.map(col => ({
                ...col,
                sortIcon: col.fieldName === this.sortField
                    ? (this.sortDirection === 'asc' ? ' ↑' : ' ↓')
                    : ''
            }));
            this.currentPage = 1;
            this.isLoading = false;
        }, 100);
    }

    handlePrevPage() {
        if (!this.isFirstPage) this.currentPage -= 1;
    }

    handleNextPage() {
        if (!this.isLastPage) this.currentPage += 1;
    }

    handlePageSizeChange(event) {
        this.pageSize = parseInt(event.target.value, 10);
        this.currentPage = 1;
    }

    _syncQuery(newQuery) {
        this.query = newQuery;
        const editor = this.template.querySelector('.qc-editor-area');
        if (editor) {
            editor.value = newQuery;
        }
    }

    _buildColumns(firstRecord) {
        this.columns = Object.keys(firstRecord)
            .filter(k => k !== 'attributes')
            .map(k => ({ label: k, fieldName: k, sortIcon: '' }));
    }

    _resetPagination() {
        this.currentPage = 1;
        this.sortField = null;
        this.sortDirection = 'asc';
    }

    _formatValue(val) {
        if (val === null || val === undefined) return '—';
        if (typeof val === 'boolean') return val ? 'true' : 'false';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    }

    _downloadCSV(data) {
        const headers = this.columns.map(c => c.label);
        const rows = data.map(row =>
            headers.map(h => {
                const val = row[h] ?? '';
                return typeof val === 'string' && (val.includes(',') || val.includes('"'))
                    ? `"${val.replace(/"/g, '""')}"`
                    : val;
            }).join(',')
        );
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.objectName || 'query'}_export_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    _toast(title, message, variant = 'info') {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}