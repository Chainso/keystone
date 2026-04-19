import { useState } from "react";

import {
  filterDefinitions,
  type WorkstreamFilterId,
  workstreamRows
} from "./workstreams-scaffold";

export interface WorkstreamRowViewModel {
  rowId: string;
  taskDisplayId: string;
  title: string;
  runDisplayId: string;
  status: string;
  updatedLabel: string;
  detailPath: string;
}

export interface WorkstreamFilterViewModel {
  filterId: WorkstreamFilterId;
  label: string;
  isActive: boolean;
}

export interface WorkstreamsViewModel {
  title: string;
  filters: WorkstreamFilterViewModel[];
  rows: WorkstreamRowViewModel[];
  setActiveFilter: (filterId: WorkstreamFilterId) => void;
}

export function useWorkstreamsViewModel(): WorkstreamsViewModel {
  const [activeFilterId, setActiveFilterId] = useState<WorkstreamFilterId>("all");

  const activeFilter =
    filterDefinitions.find((filter) => filter.filterId === activeFilterId) ?? filterDefinitions[0]!;
  const visibleRows = workstreamRows.filter(activeFilter.matches);

  return {
    title: "Active and queued project work",
    filters: filterDefinitions.map((filter) => ({
      filterId: filter.filterId,
      label: filter.label,
      isActive: filter.filterId === activeFilterId
    })),
    rows: visibleRows,
    setActiveFilter(filterId: WorkstreamFilterId) {
      setActiveFilterId(filterId);
    }
  };
}
