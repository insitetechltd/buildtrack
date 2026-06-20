const fs = require('fs');

const screenPath = 'src/screens/CreateTaskScreen.tsx';
const screenCode = fs.readFileSync(screenPath, 'utf8');

const componentStartStr = 'export default function CreateTaskScreen({';
const uiStartStr = `  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">`;

const startIndex = screenCode.indexOf(componentStartStr);
const uiStartIndex = screenCode.indexOf(uiStartStr);

const beforeComponent = screenCode.substring(0, startIndex);
const afterUI = screenCode.substring(uiStartIndex);

const injectedLogic = `export default function CreateTaskScreen({
  onNavigateBack,
  parentTaskId,
  parentSubTaskId,
  editTaskId,
  actionType,
  uploadedPhotoUrls,
  selectedPhotos: selectedPhotosProp,
  clearForm,
  clearFormTimestamp,
  onNavigateToProfile,
  onNavigateToProjectPicker
}: CreateTaskScreenProps) {
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
  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const taskReferenceInputRef = useRef<TextInput>(null);

  const { output, actions } = useCreateTaskViewAdapter({
    editTaskId,
    parentTaskId,
    parentSubTaskId,
    clearForm
  });

  const { formData, errors, pickers, readiness, aiAssistant } = output;
  const { updateField, togglePicker, submit, setTextInput, setShowSuggestionPreview, setAcceptedFields, suggestTaskFromText, clearSuggestion } = actions;

  const parentTask = parentTaskId ? tasks.find(t => t.id === parentTaskId) : null;
  const parentSubTask = parentSubTaskId ? tasks.find(t => t.id === parentSubTaskId && t.parentTaskId === parentTaskId) : null;
  const editTask = editTaskId ? tasks.find(t => t.id === editTaskId) : null;
  const userProjects = getProjectsByUser(user?.id || "");
  
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showEditReasonModal, setShowEditReasonModal] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [llmError, setLLMError] = useState<string | null>(null);

  const clearLLMError = () => setLLMError(null);

  const allAssignableUsers = getUsersByRole(['admin', 'project_manager', 'site_supervisor', 'contractor']);
  const filteredAssignableUsers = allAssignableUsers.filter((u) => {
    if (!userSearchQuery) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      (u.firstName?.toLowerCase() || "").includes(q) ||
      (u.lastName?.toLowerCase() || "").includes(q) ||
      (u.email?.toLowerCase() || "").includes(q)
    );
  });

  const setFormData = (val: any) => {
    if (typeof val === 'function') {
      const next = val(formData);
      Object.keys(next).forEach(k => updateField(k as any, next[k]));
    } else {
      Object.keys(val).forEach(k => updateField(k as any, val[k]));
    }
  };

  const handleTitleChange = (val: string) => updateField('title', val);
  const handleDescriptionChange = (val: string) => updateField('description', val);
  const handleTaskReferenceChange = (val: string) => updateField('taskReference', val);
  const handleDateChange = (date: Date) => updateField('dueDate', date);

  const handlePriorityChange = (val: string) => { updateField('priority', val); setShowPriorityPicker(false); };
  const handleCategoryChange = (val: string) => { updateField('category', val); setShowCategoryPicker(false); };
  const handleBillingStatusChange = (val: string) => { updateField('billingStatus', val); setShowBillingStatusPicker(false); };

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
  
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(
      selectedUsers.includes(userId)
        ? selectedUsers.filter((id) => id !== userId)
        : [...selectedUsers, userId]
    );
  };

  const handleUserSelect = toggleUserSelection;

  const textInput = aiAssistant.textInput;
  const showSuggestionPreview = aiAssistant.showSuggestionPreview;
  const acceptedFields = aiAssistant.acceptedFields;
  const isLLMLoading = aiAssistant.isProcessing;
  // Use lastSuggestion if available, else stub
  const lastSuggestion = (aiAssistant as any).lastSuggestion || {};

  const isUploading = readiness.isUploading;
  const isLoadingUsers = readiness.isLoadingUsers;
  const setIsLoadingUsers = () => {}; // Stub since adapter handles it
  const isSubmitting = readiness.isSubmitting;

  const handleOpenPhotoSelection = () => {};
  const handleAddPhotos = () => {};
  
  const removePhoto = (index: number) => {
    const newAttachments = [...formData.attachments];
    newAttachments.splice(index, 1);
    updateField('attachments', newAttachments);
  };

  const asyncStoragePhotoCount = 0;

  const handleCancel = () => onNavigateBack();
  const handleClearForm = () => {};
  const saveFormDataToStorage = async () => {};

  const performSubmit = async () => {
    await submit();
    onNavigateBack();
  };

  const handleSubmit = performSubmit;
  const handleEditReasonSubmit = async () => {
    setShowEditReasonModal(false);
    await performSubmit();
  };

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

`;

let newImports = beforeComponent;
if (!newImports.includes('useCreateTaskViewAdapter')) {
    newImports = newImports.replace(
        `import { useAuthStore } from "../state/authStore";`,
        `import { useAuthStore } from "../state/authStore";\nimport { useCreateTaskViewAdapter } from "../ui/viewAdapters/useCreateTaskViewAdapter";`
    );
}

const newScreenCode = newImports + injectedLogic + afterUI;
fs.writeFileSync(screenPath, newScreenCode);
console.log('Re-generated screen code');
