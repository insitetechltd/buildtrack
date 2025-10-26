import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../state/authStore";
import { useTaskStore } from "../state/taskStore.supabase";
import { useUserStoreWithInit } from "../state/userStore.supabase";
import { useProjectStoreWithCompanyInit } from "../state/projectStore.supabase";
import { useCompanyStore } from "../state/companyStore";
import { Priority, TaskCategory } from "../types/buildtrack";
import { cn } from "../utils/cn";
import ModalHandle from "../components/ModalHandle";
import { notifyDataMutation } from "../utils/DataRefreshManager";
import StandardHeader from "../components/StandardHeader";
import { PhotoUploadSection } from "../components/PhotoUploadSection";
import LogoutFAB from "../components/LogoutFAB"; // Keep for screens without create task

interface CreateTaskScreenProps {
  onNavigateBack: () => void;
  parentTaskId?: string;
  parentSubTaskId?: string;
  editTaskId?: string; // For editing an existing task
}

// InputField component defined outside to prevent re-creation
const InputField = ({ 
  label, 
  required = true, 
  error, 
  children 
}: { 
  label: string; 
  required?: boolean; 
  error?: string; 
  children: React.ReactNode;
}) => (
  <View className="mb-4">
    <Text className="text-sm font-semibold text-gray-700 mb-2">
      {label} {required && <Text className="text-red-500">*</Text>}
    </Text>
    {children}
    {error && (
      <Text className="text-red-500 text-xs mt-1">{error}</Text>
    )}
  </View>
);

export default function CreateTaskScreen({ onNavigateBack, parentTaskId, parentSubTaskId, editTaskId }: CreateTaskScreenProps) {
  const { user } = useAuthStore();
  const { createTask, createSubTask, createNestedSubTask, tasks } = useTaskStore();
  const { getUsersByRole, getUserById } = useUserStoreWithInit();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getProjectsByUser, getProjectUserAssignments, fetchProjectUserAssignments } = projectStore;
  const { getCompanyBanner } = useCompanyStore();

  // Get parent task information if creating a sub-task
  const parentTask = parentTaskId ? tasks.find(t => t.id === parentTaskId) : null;
  const parentSubTask = parentTask && parentSubTaskId 
    ? parentTask.subTasks?.find(st => st.id === parentSubTaskId) 
    : null;

  // Get task for editing
  const editTask = editTaskId ? tasks.find(t => t.id === editTaskId) : null;

  // Initial form data
  const getInitialFormData = () => {
    // If editing, pre-fill with existing task data
    if (editTask) {
      return {
        title: editTask.title,
        description: editTask.description,
        priority: editTask.priority,
        category: editTask.category,
        dueDate: new Date(editTask.dueDate),
        assignedTo: editTask.assignedTo || [],
        attachments: editTask.attachments || [],
        projectId: editTask.projectId,
      };
    }
    
    // Default form data for new tasks
    return {
      title: "",
      description: "",
      priority: "medium" as Priority,
      category: "general" as TaskCategory,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 1 week from now
      assignedTo: [] as string[],
      attachments: [] as string[],
      projectId: "",
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>(editTask?.assignedTo || []);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // All hooks must be called before any early returns
  const userProjects = getProjectsByUser(user?.id || "");
  const workers = getUsersByRole("worker");
  const managers = getUsersByRole("manager");
  const { companies } = useCompanyStore();
  
  // Debug logging for user roles
  console.log('=== USER ROLES DEBUG ===');
  console.log('- Workers:', workers.map(u => ({ id: u.id, name: u.name, companyId: u.companyId })));
  console.log('- Managers:', managers.map(u => ({ id: u.id, name: u.name, companyId: u.companyId })));
  console.log('- Current User:', user ? { id: user.id, name: user.name, companyId: user.companyId } : 'No user');
  console.log('========================');
  
  // Filter users based on selected project
  // Show ALL users who are assigned to the selected project (regardless of company)
  const allAssignableUsers = React.useMemo(() => {
    if (!formData.projectId) {
      // If no project selected, show all workers and managers
      return [...workers, ...managers];
    }
    
    // Get users assigned to the selected project
    const projectAssignments = getProjectUserAssignments(formData.projectId);
    const assignedUserIds = new Set(projectAssignments.map(a => a.userId));
    
    // Debug logging
    console.log('=== CREATE TASK USER ASSIGNMENT DEBUG ===');
    console.log('- Selected Project ID:', formData.projectId);
    console.log('- Project Assignments:', projectAssignments);
    console.log('- Assigned User IDs:', Array.from(assignedUserIds));
    console.log('- All Workers:', workers.map(u => ({ id: u.id, name: u.name })));
    console.log('- All Managers:', managers.map(u => ({ id: u.id, name: u.name })));
    
    // Get ALL users from the project (regardless of company)
    // This includes workers and managers assigned to this project
    const eligibleUsers = [...workers, ...managers].filter(u => assignedUserIds.has(u.id));
    
    console.log('- Eligible Users:', eligibleUsers.map(u => ({ id: u.id, name: u.name })));
    console.log('=========================================');
    
    return eligibleUsers;
  }, [formData.projectId, workers, managers, getProjectUserAssignments]);

  // Filter users by search query
  const filteredAssignableUsers = React.useMemo(() => {
    if (!userSearchQuery.trim()) {
      return allAssignableUsers;
    }
    
    const query = userSearchQuery.toLowerCase();
    return allAssignableUsers.filter(user => 
      user.name.toLowerCase().includes(query) ||
      (user.email && user.email.toLowerCase().includes(query)) ||
      user.position.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  }, [allAssignableUsers, userSearchQuery]);

  // Reset form every time screen comes into focus (but not for subtasks)
  useFocusEffect(
    useCallback(() => {
      // Only reset if NOT creating a subtask
      if (!parentTaskId) {
        console.log('🔄 Resetting CreateTaskScreen form on focus');
        setFormData(getInitialFormData());
        setSelectedUsers([]);
        setErrors({});
        setUserSearchQuery("");
        setShowUserPicker(false);
        setShowPriorityPicker(false);
        setShowCategoryPicker(false);
        setShowProjectPicker(false);
        setShowDatePicker(false);
      }
    }, [parentTaskId])
  );

  // Inherit parent task title and description when creating sub-task
  React.useEffect(() => {
    if (parentTaskId && parentTask && (formData.title === "" || formData.description === "")) {
      console.log('📋 Copying parent task data to subtask form');
      setFormData(prev => ({
        ...prev,
        title: parentTask.title,
        description: parentTask.description,
        projectId: parentTask.projectId || prev.projectId
      }));
    }
  }, [parentTaskId, parentTask, formData.title, formData.description]);

  // Set default project if user has access to projects
  React.useEffect(() => {
    if (userProjects.length > 0 && !formData.projectId) {
      setFormData(prev => ({ ...prev, projectId: userProjects[0].id }));
    }
  }, [userProjects, formData.projectId]);

  // Fetch project user assignments when project changes
  React.useEffect(() => {
    if (formData.projectId) {
      console.log('Fetching project user assignments for project:', formData.projectId);
      // Force fetch project assignments
      fetchProjectUserAssignments(formData.projectId);
    }
  }, [formData.projectId, fetchProjectUserAssignments]);

  // Clear selected users when project changes (since eligible users change)
  React.useEffect(() => {
    if (formData.projectId) {
      // Filter out users who are no longer eligible
      const eligibleUserIds = new Set(allAssignableUsers.map(u => u.id));
      const stillEligible = selectedUsers.filter(id => eligibleUserIds.has(id));
      
      if (stillEligible.length !== selectedUsers.length) {
        setSelectedUsers(stillEligible);
        setFormData(prev => ({ ...prev, assignedTo: stillEligible }));
      }
    }
  }, [formData.projectId, allAssignableUsers]);

  const handleTitleChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, title: text }));
  }, []);

  const handleDescriptionChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, description: text }));
  }, []);

  const handlePriorityChange = useCallback((priority: Priority) => {
    setFormData(prev => ({ ...prev, priority }));
  }, []);

  const handleCategoryChange = useCallback((category: TaskCategory) => {
    setFormData(prev => ({ ...prev, category }));
  }, []);

  const handleDateChange = useCallback((date: Date) => {
    setFormData(prev => ({ ...prev, dueDate: date }));
  }, []);

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }, []);

  // Early returns AFTER all hooks
  if (!user) return null;

  // Admin users should not be able to create tasks
  if (user.role === "admin") {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <Pressable onPress={onNavigateBack} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text className="flex-1 text-xl font-semibold text-gray-900">
            Create Task
          </Text>
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <View className="bg-amber-50 border border-amber-200 rounded-xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-amber-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="shield-outline" size={32} color="#f59e0b" />
              </View>
              <Text className="text-lg font-semibold text-amber-900 text-center mb-2">
                Access Restricted
              </Text>
              <Text className="text-sm text-amber-800 text-center leading-5">
                Administrator accounts cannot create or be assigned tasks. This function is reserved for managers and workers.
              </Text>
            </View>
            <Pressable 
              onPress={onNavigateBack}
              className="bg-amber-600 rounded-lg py-3 px-4"
            >
              <Text className="text-white font-semibold text-center">
                Go Back
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.projectId) {
      newErrors.projectId = "Please select a project";
    }

    if (selectedUsers.length === 0) {
      newErrors.assignedTo = "Please select at least one person to assign this task";
    }

    if (formData.dueDate <= new Date()) {
      newErrors.dueDate = "Due date must be in the future";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    // Clear any existing errors before validation
    setErrors({});
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      let taskId: string;
      let successMessage: string;

      if (editTaskId) {
        // Editing existing task
        await updateTask(editTaskId, {
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          category: formData.category,
          dueDate: formData.dueDate.toISOString(),
          assignedTo: selectedUsers,
          attachments: formData.attachments,
          projectId: formData.projectId,
        });
        successMessage = "Task updated successfully.";
        taskId = editTaskId;
      } else if (parentTaskId) {
        // Creating a sub-task
        const subTaskPayload = {
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          category: formData.category,
          dueDate: formData.dueDate.toISOString(),
          assignedTo: selectedUsers,
          assignedBy: user.id,
          attachments: formData.attachments,
          projectId: formData.projectId,
          updates: [],
        };

        if (parentSubTaskId) {
          // Creating a nested sub-task
          taskId = await createNestedSubTask(parentTaskId, parentSubTaskId, subTaskPayload);
          successMessage = "Nested sub-task created successfully and assigned to the selected users.";
        } else {
          // Creating a direct sub-task
          taskId = await createSubTask(parentTaskId, subTaskPayload);
          successMessage = "Sub-task created successfully and assigned to the selected users.";
        }
      } else {
        // Creating a regular task
        taskId = await createTask({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          category: formData.category,
          dueDate: formData.dueDate.toISOString(),
          assignedTo: selectedUsers,
          assignedBy: user.id,
          attachments: formData.attachments,
          projectId: formData.projectId,
        });
        successMessage = "Task created successfully and assigned to the selected users.";
      }

      console.log(`=== TASK ${editTaskId ? 'UPDATE' : 'CREATION'} DEBUG ===`);
      console.log('- Task ID:', taskId);
      console.log('- Assigned to users:', selectedUsers);
      console.log('- Project ID:', formData.projectId);
      console.log('- Assigned by:', user.id);
      console.log('- Parent Task ID:', parentTaskId);
      console.log('- Parent Sub-Task ID:', parentSubTaskId);
      console.log('===========================');

      // Notify all users about the task change
      notifyDataMutation('task');

      Alert.alert(
        editTaskId ? "Task Updated" : (parentTaskId ? "Sub-Task Created" : "Task Created"),
        successMessage,
        [
          {
            text: "OK",
            onPress: () => onNavigateBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Error",
        `Failed to ${editTaskId ? 'update' : 'create'} task. Please try again.`,
        [{ text: "OK" }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Standard Header */}
      <StandardHeader 
        title={
          editTaskId
            ? "Edit Task"
            : parentTaskId 
              ? parentSubTaskId && parentSubTask
                ? `Nested Sub-Task`
                : parentTask
                  ? `Sub-Task`
                  : "Create Sub-Task"
              : "Create New Task"
        }
        showBackButton={true}
        onBackPress={onNavigateBack}
        rightElement={
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={cn(
              "px-4 py-2 rounded-lg",
              isSubmitting 
                ? "bg-gray-300" 
                : "bg-blue-600"
            )}
          >
            <Text className="text-white font-medium">
              {isSubmitting ? "Creating..." : "Create"}
            </Text>
          </Pressable>
        }
      />

      {/* Parent Task Info Banner */}
      {parentTask && (
        <View className="bg-blue-50 border-b border-blue-100 px-6 py-3">
          <View className="flex-row items-center">
            <Ionicons name="link-outline" size={18} color="#3b82f6" />
            <Text className="text-sm text-gray-600 ml-2">
              {parentSubTask ? 'Nested under: ' : 'Sub-task of: '}
            </Text>
            <Text className="text-sm font-semibold text-gray-900 flex-1" numberOfLines={1}>
              {parentSubTask?.title || parentTask.title}
            </Text>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView 
          className="flex-1 px-6 py-4" 
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <InputField label="Title" error={errors.title}>
              <TextInput
                className={cn(
                  "border rounded-lg px-3 py-3 text-base text-gray-900 bg-white",
                  errors.title ? "border-red-300" : "border-gray-300"
                )}
                placeholder="Enter task title (e.g., Fix Roof Leak)"
                value={formData.title}
                onChangeText={handleTitleChange}
                maxLength={100}
                autoCorrect={false}
                returnKeyType="next"
              />
          </InputField>

          {/* Description */}
          <InputField label="Description" error={errors.description}>
              <TextInput
                className={cn(
                  "border rounded-lg px-3 py-3 text-base text-gray-900 bg-white",
                  errors.description ? "border-red-300" : "border-gray-300"
                )}
                placeholder="Describe the task in detail..."
                value={formData.description}
                onChangeText={handleDescriptionChange}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
                autoCorrect={false}
                returnKeyType="done"
              />
          </InputField>

          {/* Project Selection */}
          <InputField label="Project" error={errors.projectId}>
            <Pressable
              onPress={() => setShowProjectPicker(true)}
              className={cn(
                "border rounded-lg px-3 py-3 bg-white flex-row items-center justify-between",
                errors.projectId ? "border-red-300" : "border-gray-300"
              )}
            >
              <Text className={cn(
                "flex-1 text-base",
                formData.projectId ? "text-gray-900" : "text-gray-500"
              )}>
                {formData.projectId 
                  ? userProjects.find(p => p.id === formData.projectId)?.name 
                  : "Select a project"
                }
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </Pressable>
          </InputField>

          {/* Priority */}
          <InputField label="Priority">
            <Pressable
              onPress={() => setShowPriorityPicker(true)}
              className="border rounded-lg px-3 py-3 bg-white flex-row items-center justify-between"
            >
              <Text className="text-base text-gray-900 capitalize flex-1">
                {formData.priority}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </Pressable>
          </InputField>

          {/* Category */}
          <InputField label="Category">
            <Pressable
              onPress={() => setShowCategoryPicker(true)}
              className="border rounded-lg px-3 py-3 bg-white flex-row items-center justify-between"
            >
              <Text className="text-base text-gray-900 capitalize flex-1">
                {formData.category}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </Pressable>
          </InputField>

          {/* Due Date */}
          <InputField label="Due Date" error={errors.dueDate}>
            <Pressable
              onPress={() => setShowDatePicker(!showDatePicker)}
              className={cn(
                "border-2 rounded-lg px-3 py-3 bg-white flex-row items-center justify-between",
                showDatePicker ? "border-blue-600" : errors.dueDate ? "border-red-300" : "border-gray-300"
              )}
            >
              <Text className={cn(
                "text-base",
                showDatePicker ? "text-blue-600" : "text-gray-900"
              )}>
                {formData.dueDate.toLocaleDateString("en-US", { 
                  weekday: 'short',
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Text>
              <Ionicons 
                name={showDatePicker ? "calendar" : "calendar-outline"} 
                size={20} 
                color={showDatePicker ? "#3b82f6" : "#6b7280"} 
              />
            </Pressable>
          </InputField>

          {/* Date Picker - Visible when showDatePicker is true */}
          {showDatePicker && (
            <View className="bg-white border-2 border-blue-600 rounded-lg mb-4 overflow-hidden">
              <DateTimePicker
                value={formData.dueDate}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={(_event, selectedDate) => {
                  if (selectedDate) {
                    handleDateChange(selectedDate);
                  }
                }}
                textColor="#000000"
                style={{ height: 200 }}
              />
              <View className="flex-row justify-end p-3 border-t border-gray-200">
                <Pressable
                  onPress={() => setShowDatePicker(false)}
                  className="bg-blue-600 px-6 py-2 rounded-lg"
                >
                  <Text className="text-white font-semibold">Done</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Assign To */}
          <InputField label="Assign To" error={errors.assignedTo}>
            <Pressable
              onPress={() => setShowUserPicker(true)}
              className={cn(
                "border rounded-lg px-3 py-3 bg-white flex-row items-center justify-between",
                errors.assignedTo ? "border-red-300" : "border-gray-300"
              )}
            >
              <Text className="text-base text-gray-900">
                {selectedUsers.length > 0 
                  ? `${selectedUsers.length} user${selectedUsers.length > 1 ? "s" : ""} selected`
                  : "Select users to assign"
                }
              </Text>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color="#6b7280" 
              />
            </Pressable>
          </InputField>

          {/* Show selected users */}
          {selectedUsers.length > 0 && (
            <View className="bg-gray-50 border border-gray-200 rounded-lg p-3 -mt-6 mb-4">
              <Text className="text-xs font-medium text-gray-700 mb-2">Selected Users:</Text>
              <View className="flex-row flex-wrap">
                {selectedUsers.map((userId) => {
                  const user = allAssignableUsers.find(u => u.id === userId);
                  if (!user) return null;
                  return (
                    <View key={userId} className="bg-blue-100 rounded-full px-3 py-1 mr-2 mb-2 flex-row items-center">
                      <Text className="text-blue-900 text-xs font-medium mr-1">{user.name}</Text>
                      <Pressable onPress={() => toggleUserSelection(userId)}>
                        <Ionicons name="close-circle" size={16} color="#1e40af" />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Attachments */}
          <PhotoUploadSection
            photos={formData.attachments}
            onPhotosChange={(attachments) => setFormData(prev => ({ ...prev, attachments }))}
            title="Attachments"
            emptyMessage="No attachments added"
          />

          {/* Bottom Spacing */}
          <View className="h-20" />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Priority Picker Modal */}
      <Modal
        visible={showPriorityPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPriorityPicker(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <StatusBar style="dark" />
          
          <ModalHandle />
          
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => setShowPriorityPicker(false)}
              className="mr-4 w-10 h-10 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
            <Text className="text-lg font-semibold text-gray-900 flex-1">
              Select Priority
            </Text>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            {(["low", "medium", "high", "critical"] as Priority[]).map((priority) => (
              <Pressable
                key={priority}
                onPress={() => {
                  handlePriorityChange(priority);
                  setShowPriorityPicker(false);
                }}
                className={cn(
                  "bg-white border rounded-lg px-4 py-4 mb-3 flex-row items-center",
                  formData.priority === priority ? "border-blue-500 bg-blue-50" : "border-gray-300"
                )}
              >
                <View className={cn(
                  "w-5 h-5 rounded-full border-2 items-center justify-center mr-3",
                  formData.priority === priority ? "border-blue-500" : "border-gray-300"
                )}>
                  {formData.priority === priority && (
                    <View className="w-3 h-3 rounded-full bg-blue-500" />
                  )}
                </View>
                <Text className={cn(
                  "text-base font-medium capitalize flex-1",
                  formData.priority === priority ? "text-blue-900" : "text-gray-900"
                )}>
                  {priority}
                </Text>
                <Ionicons 
                  name={priority === "critical" ? "alert-circle" : priority === "high" ? "arrow-up-circle" : priority === "medium" ? "remove-circle" : "arrow-down-circle"} 
                  size={24} 
                  color={formData.priority === priority ? "#3b82f6" : "#6b7280"} 
                />
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <StatusBar style="dark" />
          
          <ModalHandle />
          
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => setShowCategoryPicker(false)}
              className="mr-4 w-10 h-10 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
            <Text className="text-lg font-semibold text-gray-900 flex-1">
              Select Category
            </Text>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            {(["general", "safety", "electrical", "plumbing", "structural", "materials"] as TaskCategory[]).map((category) => (
              <Pressable
                key={category}
                onPress={() => {
                  handleCategoryChange(category);
                  setShowCategoryPicker(false);
                }}
                className={cn(
                  "bg-white border rounded-lg px-4 py-4 mb-3 flex-row items-center",
                  formData.category === category ? "border-blue-500 bg-blue-50" : "border-gray-300"
                )}
              >
                <View className={cn(
                  "w-5 h-5 rounded-full border-2 items-center justify-center mr-3",
                  formData.category === category ? "border-blue-500" : "border-gray-300"
                )}>
                  {formData.category === category && (
                    <View className="w-3 h-3 rounded-full bg-blue-500" />
                  )}
                </View>
                <Text className={cn(
                  "text-base font-medium capitalize flex-1",
                  formData.category === category ? "text-blue-900" : "text-gray-900"
                )}>
                  {category}
                </Text>
                <Ionicons 
                  name={
                    category === "safety" ? "shield-checkmark" :
                    category === "electrical" ? "flash" :
                    category === "plumbing" ? "water" :
                    category === "structural" ? "hammer" :
                    category === "materials" ? "cube" :
                    "list"
                  } 
                  size={24} 
                  color={formData.category === category ? "#3b82f6" : "#6b7280"} 
                />
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Project Picker Modal */}
      <Modal
        visible={showProjectPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProjectPicker(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <StatusBar style="dark" />
          
          <ModalHandle />
          
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => setShowProjectPicker(false)}
              className="mr-4 w-10 h-10 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
            <Text className="text-lg font-semibold text-gray-900 flex-1">
              Select Project
            </Text>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            {userProjects.map((project) => (
              <Pressable
                key={project.id}
                onPress={() => {
                  setFormData(prev => ({ ...prev, projectId: project.id }));
                  setShowProjectPicker(false);
                }}
                className={cn(
                  "bg-white border rounded-lg px-4 py-4 mb-3 flex-row items-center",
                  formData.projectId === project.id ? "border-blue-500 bg-blue-50" : "border-gray-300"
                )}
              >
                <View className={cn(
                  "w-5 h-5 rounded-full border-2 items-center justify-center mr-3",
                  formData.projectId === project.id ? "border-blue-500" : "border-gray-300"
                )}>
                  {formData.projectId === project.id && (
                    <View className="w-3 h-3 rounded-full bg-blue-500" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className={cn(
                    "text-base font-medium",
                    formData.projectId === project.id ? "text-blue-900" : "text-gray-900"
                  )} numberOfLines={1}>
                    {project.name}
                  </Text>
                  <Text className="text-xs text-gray-600 mt-0.5" numberOfLines={1}>
                    {project.location.city}, {project.location.state}
                  </Text>
                </View>
                <Ionicons name="folder-outline" size={24} color={formData.projectId === project.id ? "#3b82f6" : "#6b7280"} />
              </Pressable>
            ))}
            
            {userProjects.length === 0 && (
              <View className="bg-white border border-gray-200 rounded-lg p-8 items-center">
                <Ionicons name="folder-open-outline" size={48} color="#9ca3af" />
                <Text className="text-gray-500 text-center mt-2">
                  No projects available
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* User Picker Modal with Search */}
      <Modal
        visible={showUserPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowUserPicker(false);
          setUserSearchQuery("");
        }}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <StatusBar style="dark" />
          
          <ModalHandle />
          
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => {
                setShowUserPicker(false);
                setUserSearchQuery("");
              }}
              className="mr-4 w-10 h-10 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
            <Text className="text-lg font-semibold text-gray-900 flex-1">
              Assign To
            </Text>
            <Text className="text-sm text-blue-600 font-medium">
              {selectedUsers.length} selected
            </Text>
          </View>

          {/* Search Bar */}
          <View className="bg-white px-6 py-3 border-b border-gray-200">
            <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
              <Ionicons name="search" size={20} color="#6b7280" />
              <TextInput
                className="flex-1 ml-2 text-base text-gray-900"
                placeholder="Search by name, email, position, or role..."
                placeholderTextColor="#9ca3af"
                value={userSearchQuery}
                onChangeText={setUserSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {userSearchQuery.length > 0 && (
                <Pressable onPress={() => setUserSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color="#6b7280" />
                </Pressable>
              )}
            </View>
            
            {/* Results count */}
            <Text className="text-xs text-gray-600 mt-2">
              {filteredAssignableUsers.length} user{filteredAssignableUsers.length !== 1 ? 's' : ''} available
              {userSearchQuery && ` (filtered from ${allAssignableUsers.length})`}
            </Text>
          </View>

          {/* User List */}
          <ScrollView className="flex-1 px-6 py-4">
            {filteredAssignableUsers.length > 0 ? (
              filteredAssignableUsers.map((assignableUser) => {
                const isSelected = selectedUsers.includes(assignableUser.id);
                return (
                  <Pressable
                    key={assignableUser.id}
                    onPress={() => toggleUserSelection(assignableUser.id)}
                    className={cn(
                      "bg-white border rounded-lg px-4 py-3 mb-3 flex-row items-center",
                      isSelected ? "border-blue-500 bg-blue-50" : "border-gray-300"
                    )}
                  >
                    {/* Checkbox */}
                    <View className={cn(
                      "w-5 h-5 rounded border-2 mr-3 items-center justify-center",
                      isSelected 
                        ? "border-blue-600 bg-blue-600" 
                        : "border-gray-300"
                    )}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color="white" />
                      )}
                    </View>

                    {/* User Info */}
                    <View className="flex-1">
                      <Text className={cn(
                        "text-base font-semibold",
                        isSelected ? "text-blue-900" : "text-gray-900"
                      )}>
                        {assignableUser.name}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Text className="text-xs text-gray-600 capitalize">
                          {assignableUser.position}
                        </Text>
                        <View className="w-1 h-1 rounded-full bg-gray-400 mx-2" />
                        <Text className="text-xs text-gray-500 capitalize">
                          {assignableUser.role}
                        </Text>
                      </View>
                      {assignableUser.email && (
                        <Text className="text-xs text-gray-500 mt-0.5">
                          {assignableUser.email}
                        </Text>
                      )}
                    </View>

                    {/* Selected indicator */}
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
                    )}
                  </Pressable>
                );
              })
            ) : allAssignableUsers.length > 0 ? (
              // No results found (filtered out)
              <View className="bg-white border border-gray-200 rounded-lg p-8 items-center">
                <Ionicons name="search-outline" size={48} color="#9ca3af" />
                <Text className="text-gray-500 text-center mt-3 font-medium">
                  No users found
                </Text>
                <Text className="text-gray-400 text-center mt-1 text-sm">
                  Try adjusting your search
                </Text>
                <Pressable
                  onPress={() => setUserSearchQuery("")}
                  className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
                >
                  <Text className="text-white font-medium">Clear Search</Text>
                </Pressable>
              </View>
            ) : (
              // No users assigned to project
              <View className="bg-white border border-gray-200 rounded-lg p-8 items-center">
                <Ionicons name="people-outline" size={48} color="#9ca3af" />
                <Text className="text-gray-500 text-center mt-3 font-medium">
                  No users assigned to this project
                </Text>
                <Text className="text-gray-400 text-center mt-1 text-sm">
                  Add team members to the project first
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer - Done Button */}
          <View className="bg-white border-t border-gray-200 px-6 py-4">
            <Pressable
              onPress={() => {
                setShowUserPicker(false);
                setUserSearchQuery("");
              }}
              className="bg-blue-600 rounded-lg py-3 items-center"
            >
              <Text className="text-white font-semibold text-base">
                Done ({selectedUsers.length} selected)
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Logout FAB */}
      <LogoutFAB />
    </SafeAreaView>
  );
}