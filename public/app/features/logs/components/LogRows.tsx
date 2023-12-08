import { cx } from '@emotion/css';
import memoizeOne from 'memoize-one';
import React, { PureComponent, MouseEvent, createRef } from 'react';
import stringSimilarity from 'string-similarity-js';

import {
  TimeZone,
  LogsDedupStrategy,
  LogRowModel,
  Field,
  LinkModel,
  LogsSortOrder,
  CoreApp,
  DataFrame,
} from '@grafana/data';
import { config } from '@grafana/runtime';
import { withTheme2, Themeable2 } from '@grafana/ui';

import { PopoverMenu } from '../../explore/Logs/PopoverMenu';
import { UniqueKeyMaker } from '../UniqueKeyMaker';
import { sortLogRows, targetIsElement } from '../utils';

//Components
import { LogRow } from './LogRow';
import { getLogRowStyles } from './getLogRowStyles';

export const PREVIEW_LIMIT = 100;

export function resolutionRounding(num: number) {
  const decimal = num - Math.floor(num);
  if (decimal < 0.25) {
    return Math.floor(num);
  } else if (decimal <= 0.5) {
    return Math.floor(num) + 0.5;
  } else if (decimal <= 0.75) {
    return Math.floor(num) + 0.75;
  } else {
    return Math.ceil(num);
  }
}

export function calculateResolutionIndex(resolution: number | undefined, length: number) {
  return resolution !== undefined && resolution > 0 ? resolutionRounding(length / resolution) : 1;
}

export interface Props extends Themeable2 {
  logRows?: LogRowModel[];
  deduplicatedRows?: LogRowModel[];
  dedupStrategy: LogsDedupStrategy;
  showLabels: boolean;
  showTime: boolean;
  wrapLogMessage: boolean;
  prettifyLogMessage: boolean;
  timeZone: TimeZone;
  enableLogDetails: boolean;
  logsSortOrder?: LogsSortOrder | null;
  previewLimit?: number;
  forceEscape?: boolean;
  displayedFields?: string[];
  app?: CoreApp;
  showContextToggle?: (row: LogRowModel) => boolean;
  onClickFilterLabel?: (key: string, value: string, frame?: DataFrame) => void;
  onClickFilterOutLabel?: (key: string, value: string, frame?: DataFrame) => void;
  getFieldLinks?: (field: Field, rowIndex: number, dataFrame: DataFrame) => Array<LinkModel<Field>>;
  onClickShowField?: (key: string) => void;
  onClickHideField?: (key: string) => void;
  onPinLine?: (row: LogRowModel) => void;
  onUnpinLine?: (row: LogRowModel) => void;
  onLogRowHover?: (row?: LogRowModel) => void;
  onOpenContext?: (row: LogRowModel, onClose: () => void) => void;
  onPermalinkClick?: (row: LogRowModel) => Promise<void>;
  permalinkedRowId?: string;
  scrollIntoView?: (element: HTMLElement) => void;
  isFilterLabelActive?: (key: string, value: string, refId?: string) => Promise<boolean>;
  pinnedRowId?: string;
  containerRendered?: boolean;
  /**
   * If false or undefined, the `contain:strict` css property will be added to the wrapping `<table>` for performance reasons.
   * Any overflowing content will be clipped at the table boundary.
   */
  overflowingContent?: boolean;
  onClickFilterValue?: (value: string, refId?: string) => void;
  onClickFilterOutValue?: (value: string, refId?: string) => void;
  showDetails?: (row: LogRowModel) => void;
  logDetailsRow?: LogRowModel;
  highlightSearchwords: boolean;
  noMenu?: boolean;
  similaritySetting?: { row: LogRowModel; type: 'show' | 'hide' };
  resolution?: number;
}

interface State {
  renderAll: boolean;
  selection: string;
  selectedRow: LogRowModel | null;
  popoverMenuCoordinates: { x: number; y: number };
}

class UnThemedLogRows extends PureComponent<Props, State> {
  renderAllTimer: number | null = null;
  logRowsRef = createRef<HTMLDivElement>();

  static defaultProps = {
    previewLimit: PREVIEW_LIMIT,
  };

  state: State = {
    renderAll: false,
    selection: '',
    selectedRow: null,
    popoverMenuCoordinates: { x: 0, y: 0 },
  };

  /**
   * Toggle the `contextIsOpen` state when a context of one LogRow is opened in order to not show the menu of the other log rows.
   */
  openContext = (row: LogRowModel, onClose: () => void): void => {
    if (this.props.onOpenContext) {
      this.props.onOpenContext(row, onClose);
    }
  };

  popoverMenuSupported() {
    if (!config.featureToggles.logRowsPopoverMenu || this.props.app !== CoreApp.Explore) {
      return false;
    }
    return Boolean(this.props.onClickFilterOutValue || this.props.onClickFilterValue);
  }

  handleSelection = (e: MouseEvent<HTMLTableRowElement>, row: LogRowModel): boolean => {
    if (this.popoverMenuSupported() === false) {
      return false;
    }
    const selection = document.getSelection()?.toString();
    if (!selection) {
      return false;
    }
    if (!this.logRowsRef.current) {
      return false;
    }
    const parentBounds = this.logRowsRef.current?.getBoundingClientRect();
    this.setState({
      selection,
      popoverMenuCoordinates: { x: e.clientX - parentBounds.left, y: e.clientY - parentBounds.top },
      selectedRow: row,
    });
    document.addEventListener('click', this.handleDeselection);
    document.addEventListener('contextmenu', this.handleDeselection);
    return true;
  };

  handleDeselection = (e: Event) => {
    if (targetIsElement(e.target) && !this.logRowsRef.current?.contains(e.target)) {
      // The mouseup event comes from outside the log rows, close the menu.
      this.closePopoverMenu();
      return;
    }
    if (document.getSelection()?.toString()) {
      return;
    }
    this.closePopoverMenu();
  };

  closePopoverMenu = () => {
    document.removeEventListener('click', this.handleDeselection);
    document.removeEventListener('contextmenu', this.handleDeselection);
    this.setState({
      selection: '',
      popoverMenuCoordinates: { x: 0, y: 0 },
      selectedRow: null,
    });
  };

  componentDidMount() {
    // Staged rendering
    const { logRows, previewLimit } = this.props;
    const rowCount = logRows ? logRows.length : 0;
    // Render all right away if not too far over the limit
    const renderAll = rowCount <= previewLimit! * 2;
    if (renderAll) {
      this.setState({ renderAll });
    } else {
      this.renderAllTimer = window.setTimeout(() => this.setState({ renderAll: true }), 2000);
    }
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleDeselection);
    document.removeEventListener('contextmenu', this.handleDeselection);
    if (this.renderAllTimer) {
      clearTimeout(this.renderAllTimer);
    }
  }

  makeGetRows = memoizeOne((orderedRows: LogRowModel[]) => {
    return () => orderedRows;
  });

  sortLogs = memoizeOne((logRows: LogRowModel[], logsSortOrder: LogsSortOrder): LogRowModel[] =>
    sortLogRows(logRows, logsSortOrder)
  );

  filterSimilarity = memoizeOne(
    (logRows: LogRowModel[], similaritySetting: { row: LogRowModel; type: 'show' | 'hide' }) => {
      const similarLines = logRows.map((l) => ({
        logRow: l,
        similarity: stringSimilarity(similaritySetting.row.entry, l.entry),
      }));
      return similarLines
        .filter((l) => (similaritySetting.type === 'hide' ? l.similarity <= 0.5 : l.similarity > 0.5))
        .map((l) => l.logRow);
    }
  );

  render() {
    const { deduplicatedRows, logRows, dedupStrategy, theme, logsSortOrder, similaritySetting, ...rest } = this.props;
    const styles = getLogRowStyles(theme);
    let dedupedRows = deduplicatedRows ? deduplicatedRows : logRows;
    if (dedupedRows && similaritySetting) {
      dedupedRows = this.filterSimilarity(dedupedRows, similaritySetting);
    }
    const hasData = logRows && logRows.length > 0;
    const dedupCount = dedupedRows
      ? dedupedRows.reduce((sum, row) => (row.duplicates ? sum + row.duplicates : sum), 0)
      : 0;
    const showDuplicates = dedupStrategy !== LogsDedupStrategy.none && dedupCount > 0;
    // Staged rendering
    const processedRows = dedupedRows ? dedupedRows : [];
    const orderedRows = logsSortOrder ? this.sortLogs(processedRows, logsSortOrder) : processedRows;

    // React profiler becomes unusable if we pass all rows to all rows and their labels, using getter instead
    const getRows = this.makeGetRows(orderedRows);

    const keyMaker = new UniqueKeyMaker();
    const { resolution } = this.props;
    const resolutionIndex = calculateResolutionIndex(resolution, logRows.length);

    return (
      <div className={styles.logRows} ref={this.logRowsRef}>
        {this.state.selection && this.state.selectedRow && (
          <PopoverMenu
            close={this.closePopoverMenu}
            row={this.state.selectedRow}
            selection={this.state.selection}
            {...this.state.popoverMenuCoordinates}
            onClickFilterValue={rest.onClickFilterValue}
            onClickFilterOutValue={rest.onClickFilterOutValue}
          />
        )}
        <table className={cx(styles.logsRowsTable, this.props.overflowingContent ? '' : styles.logsRowsTableContain)}>
          <tbody>
            {hasData &&
              orderedRows.map((row, index) =>
                index % resolutionIndex <= 0.5 ? (
                  <LogRow
                    key={keyMaker.getKey(row.uid)}
                    getRows={getRows}
                    row={row}
                    showDuplicates={showDuplicates}
                    logsSortOrder={logsSortOrder}
                    onOpenContext={this.openContext}
                    styles={styles}
                    onPermalinkClick={this.props.onPermalinkClick}
                    scrollIntoView={this.props.scrollIntoView}
                    permalinkedRowId={this.props.permalinkedRowId}
                    onPinLine={this.props.onPinLine}
                    onUnpinLine={this.props.onUnpinLine}
                    pinned={this.props.pinnedRowId === row.uid}
                    isFilterLabelActive={this.props.isFilterLabelActive}
                    handleTextSelection={this.popoverMenuSupported() ? this.handleSelection : undefined}
                    logDetailsRow={this.props.logDetailsRow}
                    noMenu={this.props.noMenu}
                    {...rest}
                  />
                ) : null
              )}
          </tbody>
        </table>
      </div>
    );
  }
}

export const LogRows = withTheme2(UnThemedLogRows);
LogRows.displayName = 'LogsRows';
