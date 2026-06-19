import type { 
  TaskDetailActionItem,
  TaskDetailBannerModel,
  TaskDetailActivityModel,
  TaskDetailSectionModel
} from "../contracts/viewAdapters";
import type { 
  ButtonPrimitiveContract,
  BannerPrimitiveContract,
  ActivityPrimitiveContract,
  ContainerPrimitiveContract
} from "../contracts/primitives";

export function mapActionItemToButtonProps(item: TaskDetailActionItem): ButtonPrimitiveContract {
  return {
    primitiveId: item.id,
    family: "button",
    label: item.label,
    icon: item.icon,
    isDisabled: item.isDisabled,
    density: item.density,
    structuralState: item.structuralState,
    accessibilityLabel: item.label,
    isEmpty: false,
    isLoading: item.structuralState === 'loading',
    isStale: item.structuralState === 'stale',
    onPress: () => {}, // Bound at the UI layer
  };
}

export function mapBannerModelToBannerProps(item: TaskDetailBannerModel): BannerPrimitiveContract {
  return {
    primitiveId: item.id,
    family: "banner",
    type: item.type,
    title: item.title,
    subtitle: item.subtitle,
    iconName: item.iconName,
    colorScheme: item.colorScheme,
    density: item.density,
    structuralState: item.structuralState,
    accessibilityLabel: item.title,
    isEmpty: false,
    isLoading: item.structuralState === 'loading',
    isStale: item.structuralState === 'stale',
    isDisabled: item.structuralState === 'disabled',
  };
}

export function mapActivityModelToActivityProps(item: TaskDetailActivityModel): ActivityPrimitiveContract {
  return {
    primitiveId: item.id,
    family: "activity",
    userId: item.userId,
    userName: item.userName,
    activityType: item.activityType,
    timestamp: item.timestamp,
    description: item.description,
    reason: item.reason,
    completionPercentage: item.completionPercentage,
    statusToken: item.statusToken,
    statusLabel: item.statusLabel,
    photos: item.photos,
    density: item.density,
    structuralState: item.structuralState,
    accessibilityLabel: item.description,
    isEmpty: false,
    isLoading: item.structuralState === 'loading',
    isStale: item.structuralState === 'stale',
    isDisabled: item.structuralState === 'disabled',
  };
}

export function mapSectionModelToContainerProps(item: TaskDetailSectionModel): ContainerPrimitiveContract {
  return {
    primitiveId: item.id,
    family: "container",
    density: item.density,
    structuralState: item.structuralState,
    accessibilityLabel: item.title,
    isEmpty: item.rows.length === 0,
    isLoading: item.structuralState === 'loading',
    isStale: item.structuralState === 'stale',
    isDisabled: item.structuralState === 'disabled',
    chrome: {
      title: item.title,
      metadataRows: item.rows.map(row => ({
        rowId: row.id,
        label: row.label,
        value: row.value,
        semanticToken: row.statusToken,
      })),
      actionSlots: [],
    },
    body: {},
  };
}
