// Edit Project Modal Component - Simplified version using ProjectForm
function EditProjectModal({
  visible,
  project,
  onClose,
  onSave,
}: {
  visible: boolean;
  project: Project;
  onClose: () => void;
  onSave: (project: Project) => void;
}) {
  const { user } = useAuthStore();
  const { getLeadPMForProject, assignUserToProject, removeUserFromProject } = useProjectStoreWithCompanyInit(user?.companyId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);

    try {
      const updatedProject: Project = {
        ...project,
        name: formData.name,
        description: formData.description,
        status: formData.status,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        location: formData.location,
        clientInfo: formData.clientInfo,
        updatedAt: new Date().toISOString(),
      };

      // Handle Lead PM changes
      const currentLeadPM = getLeadPMForProject(project.id);
      if (formData.selectedLeadPM !== currentLeadPM) {
        if (currentLeadPM) {
          await removeUserFromProject(currentLeadPM, project.id);
        }
        
        if (formData.selectedLeadPM) {
          await assignUserToProject(formData.selectedLeadPM, project.id, "lead_project_manager", user.id);
        }
      }

      onSave(updatedProject);
      onClose();
    } catch (error) {
      console.error("Error updating project:", error);
      Alert.alert("Error", "Failed to update project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        
        <StandardHeader
          title="Edit Project"
          showBackButton={true}
          onBackPress={onClose}
        />

        <ProjectForm
          mode="edit"
          project={project}
          onSubmit={handleSubmit}
          onCancel={onClose}
          submitButtonText="Save"
          isSubmitting={isSubmitting}
        />
      </SafeAreaView>
    </Modal>
  );
}

