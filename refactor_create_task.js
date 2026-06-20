const fs = require('fs');

const screenPath = 'src/screens/CreateTaskScreen.tsx';
let screenCode = fs.readFileSync(screenPath, 'utf8');

// The start of the component
const componentStartStr = 'export default function CreateTaskScreen({ onNavigateBack, parentTaskId, parentSubTaskId, editTaskId, actionType, uploadedPhotoUrls, selectedPhotos: selectedPhotosProp, clearForm, clearFormTimestamp, onNavigateToProfile, onNavigateToProjectPicker }: CreateTaskScreenProps) {';

const uiStartStr = `  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">`;

const componentStartIndex = screenCode.indexOf(componentStartStr);
const uiStartIndex = screenCode.indexOf(uiStartStr);

if (componentStartIndex === -1 || uiStartIndex === -1) {
    console.error('Could not find start/end bounds');
    process.exit(1);
}

const beforeComponent = screenCode.substring(0, componentStartIndex);
const afterUI = screenCode.substring(uiStartIndex);

// We need to generate the new logic block between componentStartStr and uiStartStr.
// It must:
// 1. Use the adapter
// 2. Define `handleTitleChange`, `handleDescriptionChange`, etc. to wrap adapter actions.
// 3. Extract some UI state that is strictly needed by the render function (like `userSearchQuery`, `filteredUsers`, `showEditReasonModal`, etc.)
// 4. Implement `uploadPhotoObjects` if not in adapter (or just leave it there for now).

const injectedLogic = `
  const effectiveActionType = actionType || (editTaskId ? 'edit' : undefined);

  if (effectiveActionType && effectiveActionType !== 'edit' && editTaskId) {
    return <TaskActionScreen 
      actionType={effectiveActionType} 
      taskId={editTaskId} 
      onNavigateBack={onNavigateBack}
      onNavigateToProfile={onNavigateToProfile}
      onNavigateToProjectPicker={onNavigateToProjectPicker}
    />;
  }

  const t = useTranslation();
  const dateFormatter = useDateFormatter();
  const { user } = useAuthStore();
  const { getCompanyBanner } = useCompanyStore();
  const { isFavoriteUser, toggleFavoriteUser } = useUserPreferencesStore();
  
  const { tasks } = useTaskStore();
  const { getUsersByRole } = useUserStoreWithInit();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getProjectsByUser } = projectStore;

  const scrollViewRef = useRef<ScrollView>(null);
  
  // Adapter hook
  const { output, actions } = useCreateTaskViewAdapter({
    editTaskId,
    parentTaskId,
    parentSubTaskId,
    clearForm
  });

  const { formData, errors, pickers, readiness, aiAssistant } = output;
  const { updateField, togglePicker, submit, setTextInput, setShowSuggestionPreview, setAcceptedFields, suggestTaskFromText, clearSuggestion } = actions;

  // Derive necessary data for the UI
  const parentTask = parentTaskId ? tasks.find(t => t.id === parentTaskId) : null;
  const parentSubTask = parentSubTaskId ? tasks.find(t => t.id === parentSubTaskId && t.parentTaskId === parentTaskId) : null;
  const editTask = editTaskId ? tasks.find(t => t.id === editTaskId) : null;
  const userProjects = getProjectsByUser(user?.id || "");
  
  // Local UI State
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showEditReasonModal, setShowEditReasonModal] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [llmError, setLLMError] = useState<string | null>(null);

  const clearLLMError = () => setLLMError(null);

  // Users for assignment
  const users = getUsersByRole(['admin', 'project_manager', 'site_supervisor', 'contractor']);
  const filteredUsers = users.filter((u) => {
    if (!userSearchQuery) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      (u.firstName?.toLowerCase() || "").includes(q) ||
      (u.lastName?.toLowerCase() || "").includes(q) ||
      (u.email?.toLowerCase() || "").includes(q)
    );
  });

  // Action Mappings
  const handleTitleChange = (val: string) => updateField('title', val);
  const handleDescriptionChange = (val: string) => updateField('description', val);
  const handleTaskReferenceChange = (val: string) => updateField('taskReference', val);
  const handleDateChange = (date: Date) => updateField('dueDate', date);

  const showDatePicker = pickers.showDatePicker;
  const setShowDatePicker = (val: boolean) => togglePicker('showDatePicker', val);
  
  const showPriorityPicker = pickers.showPriorityPicker;
  const setShowPriorityPicker = (val: boolean) => togglePicker('showPriorityPicker', val);
  
  const showCategoryPicker = pickers.showCategoryPicker;
  const setShowCategoryPicker = (val: boolean) => togglePicker('showCategoryPicker', val);
  
  const showBillingStatusPicker = pickers.showBillingStatusPicker;
  const setShowBillingStatusPicker = (val: boolean) => togglePicker('showBillingStatusPicker', val);

  const showProjectPicker = pickers.showProjectPicker;
  const setShowProjectPicker = (val: boolean) => togglePicker('showProjectPicker', val);

  const showUserPicker = pickers.showUserPicker;
  const setShowUserPicker = (val: boolean) => togglePicker('showUserPicker', val);

  const selectedUsers = formData.assignedTo;
  const setSelectedUsers = (val: string[]) => updateField('assignedTo', val);
  
  const handleOpenUserPicker = () => setShowUserPicker(true);
  
  const handleUserSelect = (userId: string) => {
    setSelectedUsers(
      selectedUsers.includes(userId)
        ? selectedUsers.filter((id) => id !== userId)
        : [...selectedUsers, userId]
    );
  };

  const textInput = aiAssistant.textInput;
  const showSuggestionPreview = aiAssistant.showSuggestionPreview;
  const acceptedFields = aiAssistant.acceptedFields;
  const isLLMLoading = aiAssistant.isProcessing;

  const isUploading = readiness.isUploading;
  const isLoadingUsers = readiness.isLoadingUsers;
  const isSubmitting = readiness.isSubmitting;

  // Photo handlers
  const handleOpenPhotoSelection = () => {
    // Legacy integration - normally adapter handles this
    // We keep this empty for now since PhotoSelectionScreen is used via navigation
  };
  
  const removePhoto = (index: number) => {
    const newAttachments = [...formData.attachments];
    newAttachments.splice(index, 1);
    updateField('attachments', newAttachments);
  };

  const asyncStoragePhotoCount = 0; // Stub for UI

  const handleCancel = () => onNavigateBack();
  const handleClearForm = () => {};

  const handleEditReasonSubmit = async () => {
    setShowEditReasonModal(false);
    await submit(); // Note: reason ignored in adapter for now
    onNavigateBack();
  };

  const saveFormDataToStorage = async () => {};

  // For photos, just sync selectedPhotosProp and uploadedPhotoUrls to attachments
  useEffect(() => {
    if (selectedPhotosProp && selectedPhotosProp.length > 0) {
      updateField('attachments', [...formData.attachments, ...selectedPhotosProp]);
    }
  }, [selectedPhotosProp]);

  useEffect(() => {
    if (uploadedPhotoUrls && uploadedPhotoUrls.length > 0) {
      updateField('attachments', [...formData.attachments, ...uploadedPhotoUrls]);
    }
  }, [uploadedPhotoUrls]);

  // Early returns
  if (!user) return null;
  if (isAdmin(user)) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <StandardHeader 
          title={t.tasks.createTask}
          showBackButton={true}
          onBackPress={onNavigateBack}
        />
        <View className="flex-1 items-center justify-center px-6">
          <Text>{t.createTask.adminCannotCreateTasks}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Pre-fill on edit
  useEffect(() => {
    if (editTask) {
      updateField('title', editTask.title);
      updateField('description', editTask.description || "");
      updateField('taskReference', editTask.taskReference || "");
      updateField('billingStatus', editTask.billingStatus || "non_billable");
      updateField('priority', editTask.priority || "medium");
      updateField('category', editTask.category || "general");
      updateField('dueDate', new Date(editTask.dueDate));
      updateField('projectId', editTask.projectId || "");
      updateField('assignedTo', editTask.assignedTo || []);
      updateField('attachments', editTask.attachments || []);
    }
  }, [editTask]);

`;

// We also need to add `import { useCreateTaskViewAdapter } from "../ui/viewAdapters/useCreateTaskViewAdapter";`
let newImports = beforeComponent;
if (!newImports.includes('useCreateTaskViewAdapter')) {
    newImports = newImports.replace(
        `import { useAuthStore } from "../state/authStore";`,
        `import { useAuthStore } from "../state/authStore";\nimport { useCreateTaskViewAdapter } from "../ui/viewAdapters/useCreateTaskViewAdapter";`
    );
}

const newScreenCode = newImports + componentStartStr + injectedLogic + afterUI;
fs.writeFileSync(screenPath + '.new', newScreenCode);

console.log('Generated new screen code to ' + screenPath + '.new');
