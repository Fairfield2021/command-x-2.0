import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Detect if running in Electron - HashRouter is required for file:// protocol
const isElectron =
  typeof window !== "undefined" && window.electronAPI?.isElectron;
const Router = isElectron ? HashRouter : BrowserRouter;
// SidebarProvider is now inside NavigationLayout
import { AuthProvider } from "@/contexts/AuthContext";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";
import { LocationTrackingProvider } from "@/contexts/LocationTrackingContext";
import { UIDensityProvider } from "@/contexts/UIDensityContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NavigationLayout } from "@/components/layout/navigation";
import { useNativeStatusBar } from "@/hooks/useNativeStatusBar";
import { ChatInterface } from "@/components/ai-assistant/ChatInterface";
import { PageLoader } from "@/components/ui/PageLoader";
import { PortalProtectedRoute } from "./components/portal/PortalProtectedRoute";
import { VendorProtectedRoute } from "./components/vendor-portal/VendorProtectedRoute";
import { SubcontractorProtectedRoute } from "./components/subcontractor-portal/SubcontractorProtectedRoute";
import { UpdateNotification } from "./components/electron/UpdateNotification";

// Lazy-loaded page components
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const DesktopCallback = lazy(() => import("./pages/DesktopCallback"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const Products = lazy(() => import("./pages/Products"));
const CompanyHub = lazy(() => import("./pages/CompanyHub"));
const Customers = lazy(() => import("./pages/Customers"));
const CustomerDetail = lazy(() => import("./pages/CustomerDetail"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Vendors = lazy(() => import("./pages/Vendors"));
const VendorDetail = lazy(() => import("./pages/VendorDetail"));
const VendorBills = lazy(() => import("./pages/VendorBills"));
const VendorBillDetail = lazy(() => import("./pages/VendorBillDetail"));
const VendorDocuments = lazy(() => import("./pages/VendorDocuments"));
const Jobs = lazy(() => import("./pages/Jobs"));
const Sales = lazy(() => import("./pages/Sales"));
const Estimates = lazy(() => import("./pages/Estimates"));
const EstimateDetail = lazy(() => import("./pages/EstimateDetail"));
const JobOrderDetail = lazy(() => import("./pages/JobOrderDetail"));
const EditJobOrder = lazy(() => import("./pages/EditJobOrder"));
const PurchaseOrders = lazy(() => import("./pages/PurchaseOrders"));
const PurchaseOrderDetail = lazy(() => import("./pages/PurchaseOrderDetail"));
const Invoices = lazy(() => import("./pages/Invoices"));
const InvoiceDetail = lazy(() => import("./pages/InvoiceDetail"));
const TimeTracking = lazy(() => import("./pages/TimeTracking"));
const OverheadAnalysis = lazy(() => import("./pages/OverheadAnalysis"));
const Reports = lazy(() => import("./pages/ReportsPage"));
const TeamTimesheet = lazy(() => import("./pages/TeamTimesheet"));
const Reimbursements = lazy(() => import("./pages/Reimbursements"));
const ProjectAssignments = lazy(() => import("./pages/ProjectAssignments"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const ApproveEstimate = lazy(() => import("./pages/ApproveEstimate"));
const Personnel = lazy(() => import("./pages/Personnel"));
const PeopleDirectory = lazy(() => import("./pages/PeopleDirectory"));
const PersonnelDetail = lazy(() => import("./pages/PersonnelDetail"));
const PersonnelRegistrationPortal = lazy(() => import("./pages/PersonnelRegistrationPortal"));
const PersonnelInviteRegister = lazy(() => import("./pages/PersonnelInviteRegister"));
const BadgeTemplates = lazy(() => import("./pages/BadgeTemplates"));
const BadgeTemplateEditor = lazy(() => import("./pages/BadgeTemplateEditor"));
const QuickBooksSettings = lazy(() => import("./pages/QuickBooksSettings"));
const ExpenseCategories = lazy(() => import("./pages/ExpenseCategories"));
const Messages = lazy(() => import("./pages/Messages"));
const Conversations = lazy(() => import("./pages/Conversations"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const EULA = lazy(() => import("./pages/legal/EULA"));
const Copyright = lazy(() => import("./pages/legal/Copyright"));
const Features = lazy(() => import("./pages/Features"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PortalDashboard = lazy(() => import("./pages/portal/PortalDashboard"));
const PortalHours = lazy(() => import("./pages/portal/PortalHours"));
const PortalProjects = lazy(() => import("./pages/portal/PortalProjects"));
const PortalProjectDetail = lazy(() => import("./pages/portal/PortalProjectDetail"));
const PortalAssets = lazy(() => import("./pages/portal/PortalAssets"));
const PortalDocuments = lazy(() => import("./pages/portal/PortalDocuments"));
const PortalReimbursements = lazy(() => import("./pages/portal/PortalReimbursements"));
const PortalNotifications = lazy(() => import("./pages/portal/PortalNotifications"));
const PortalSettings = lazy(() => import("./pages/portal/PortalSettings"));
const PortalTaxForms = lazy(() => import("./pages/portal/PortalTaxForms"));
const PortalTimeClock = lazy(() => import("./pages/portal/PortalTimeClock"));
const PortalLogin = lazy(() => import("./pages/portal/PortalLogin"));
const AcceptPortalInvitation = lazy(() => import("./pages/portal/AcceptPortalInvitation"));
const ContractorPortal = lazy(() => import("./pages/contractor/ContractorPortal"));
const ContractorSubmissionSuccess = lazy(() => import("./pages/contractor/ContractorSubmissionSuccess"));
const ContractorSubmissions = lazy(() => import("./pages/admin/ContractorSubmissions"));
const ContractorFormBuilder = lazy(() => import("./pages/admin/ContractorFormBuilder"));
const VendorPortalPreview = lazy(() => import("./pages/admin/VendorPortalPreview"));
const PersonnelPortalPreview = lazy(() => import("./pages/admin/PersonnelPortalPreview"));
const PermissionsManagement = lazy(() => import("./pages/PermissionsManagement"));
const StaffingMapView = lazy(() => import("./pages/StaffingMapView"));

// Vendor Portal
const VendorLogin = lazy(() => import("./pages/vendor-portal/VendorLogin"));
const AcceptVendorInvitation = lazy(() => import("./pages/vendor-portal/AcceptVendorInvitation"));
const VendorDashboard = lazy(() => import("./pages/vendor-portal/VendorDashboard"));
const VendorPOsList = lazy(() => import("./pages/vendor-portal/VendorPOsList"));
const VendorPODetail = lazy(() => import("./pages/vendor-portal/VendorPODetail"));
const VendorBillsList = lazy(() => import("./pages/vendor-portal/VendorBillsList"));
const VendorPortalBillDetail = lazy(() => import("./pages/vendor-portal/VendorBillDetail"));
const VendorNewBill = lazy(() => import("./pages/vendor-portal/VendorNewBill"));
const VendorSettings = lazy(() => import("./pages/vendor-portal/VendorSettings"));

// Subcontractor Portal
const SubcontractorLogin = lazy(() => import("./pages/subcontractor-portal/SubcontractorLogin"));
const SubcontractorDashboard = lazy(() => import("./pages/subcontractor-portal/SubcontractorDashboard"));
const SubcontractorPOList = lazy(() => import("./pages/subcontractor-portal/SubcontractorPOList"));
const SubcontractorPODetail = lazy(() => import("./pages/subcontractor-portal/SubcontractorPODetail"));
const SubcontractorBillsList = lazy(() => import("./pages/subcontractor-portal/SubcontractorBillsList"));
const SubcontractorBillDetail = lazy(() => import("./pages/subcontractor-portal/SubcontractorBillDetail"));
const SubcontractorNewBill = lazy(() => import("./pages/subcontractor-portal/SubcontractorNewBill"));
const SubcontractorCompletions = lazy(() => import("./pages/subcontractor-portal/SubcontractorCompletions"));
const SubcontractorCompletionDetail = lazy(() => import("./pages/subcontractor-portal/SubcontractorCompletionDetail"));
const SubcontractorCompletionHistory = lazy(() => import("./pages/subcontractor-portal/SubcontractorCompletionHistory"));
const CompletionReviews = lazy(() => import("./pages/CompletionReviews"));

const NewChangeOrder = lazy(() => import("./pages/NewChangeOrder"));
const EditChangeOrder = lazy(() => import("./pages/EditChangeOrder"));
const ChangeOrderDetail = lazy(() => import("./pages/ChangeOrderDetail"));
const ApproveChangeOrder = lazy(() => import("./pages/ApproveChangeOrder"));
const ApproveChangeOrderPublic = lazy(() => import("./pages/ApproveChangeOrderPublic"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const StaffingApplications = lazy(() => import("./pages/StaffingApplications"));
const JobPostingEntries = lazy(() => import("./pages/JobPostingEntries"));
const PublicApplicationForm = lazy(() => import("./pages/PublicApplicationForm"));
const EditApplication = lazy(() => import("./pages/EditApplication"));
const ApplicationFormTemplates = lazy(() => import("./pages/ApplicationFormTemplates"));
const ApplicationFormBuilder = lazy(() => import("./pages/ApplicationFormBuilder"));
const PersonnelOnboarding = lazy(() => import("./pages/PersonnelOnboarding"));
const OnboardingComplete = lazy(() => import("./pages/OnboardingComplete"));
const AdminNotifications = lazy(() => import("./pages/AdminNotifications"));
const SessionHistory = lazy(() => import("./pages/SessionHistory"));
const ActivityHistory = lazy(() => import("./pages/ActivityHistory"));
const AiDevAssistant = lazy(() => import("./pages/admin/AiDevAssistant"));
const Trash = lazy(() => import("./pages/admin/Trash"));
const DocumentCenter = lazy(() => import("./pages/DocumentCenter"));
const VendorOnboarding = lazy(() => import("./pages/VendorOnboarding"));
const VendorOnboardingComplete = lazy(() => import("./pages/VendorOnboardingComplete"));

const queryClient = new QueryClient();

// Wrapper component to use status bar hook inside ThemeProvider
const NativeStatusBarManager = () => {
  useNativeStatusBar();
  return null;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <NativeStatusBarManager />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Router>
            <AuthProvider>
              <LocationTrackingProvider>
                <AIAssistantProvider>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/auth/callback" element={<AuthCallback />} />
                      <Route
                        path="/auth/desktop-callback"
                        element={<DesktopCallback />}
                      />
                      <Route path="/unauthorized" element={<Unauthorized />} />
                      <Route
                        path="/accept-invitation"
                        element={<AcceptInvitation />}
                      />
                      <Route
                        path="/approve-estimate/:token"
                        element={<ApproveEstimate />}
                      />
                      <Route
                        path="/approve-change-order/:token"
                        element={<ApproveChangeOrder />}
                      />
                      <Route
                        path="/approve-co/:token"
                        element={<ApproveChangeOrderPublic />}
                      />
                      <Route
                        path="/personnel/register"
                        element={<PersonnelRegistrationPortal />}
                      />
                      <Route
                        path="/register/:token"
                        element={<PersonnelInviteRegister />}
                      />
                      <Route path="/legal/privacy" element={<PrivacyPolicy />} />
                      <Route path="/legal/terms" element={<TermsOfService />} />
                      <Route path="/legal/eula" element={<EULA />} />
                      <Route path="/legal/copyright" element={<Copyright />} />
                      <Route path="/features" element={<Features />} />
                      {/* Public Application Form */}
                      <Route
                        path="/apply/:token"
                        element={<PublicApplicationForm />}
                      />
                      <Route
                        path="/apply/edit/:editToken"
                        element={<EditApplication />}
                      />
                      {/* Onboarding Routes */}
                      <Route
                        path="/onboard/:token"
                        element={<PersonnelOnboarding />}
                      />
                      <Route
                        path="/onboarding-complete/:token"
                        element={<OnboardingComplete />}
                      />
                      {/* Vendor Onboarding Routes */}
                      <Route
                        path="/vendor-onboarding/:token"
                        element={<VendorOnboarding />}
                      />
                      <Route
                        path="/vendor-onboarding-complete"
                        element={<VendorOnboardingComplete />}
                      />
                      {/* Public Contractor Routes */}
                      <Route path="/contractor" element={<ContractorPortal />} />
                      <Route
                        path="/contractor/success"
                        element={<ContractorSubmissionSuccess />}
                      />

                      {/* Admin Contractor Routes - moved to SidebarLayout group below */}
                      {/* Portal Routes */}
                      <Route path="/portal/login" element={<PortalLogin />} />
                      <Route
                        path="/portal/accept-invite/:token"
                        element={<AcceptPortalInvitation />}
                      />
                      <Route
                        path="/portal"
                        element={
                          <PortalProtectedRoute>
                            <PortalDashboard />
                          </PortalProtectedRoute>
                        }
                      />
                      <Route
                        path="/portal/time-clock"
                        element={
                          <PortalProtectedRoute>
                            <PortalTimeClock />
                          </PortalProtectedRoute>
                        }
                      />
                      <Route
                        path="/portal/hours"
                        element={
                          <PortalProtectedRoute>
                            <PortalHours />
                          </PortalProtectedRoute>
                        }
                      />
                      <Route
                        path="/portal/projects"
                        element={
                          <PortalProtectedRoute>
                            <PortalProjects />
                          </PortalProtectedRoute>
                        }
                      />
                      <Route
                        path="/portal/projects/:id"
                        element={
                          <PortalProtectedRoute>
                            <PortalProjectDetail />
                          </PortalProtectedRoute>
                        }
                      />
                      <Route
                        path="/portal/documents"
                        element={
                          <PortalProtectedRoute>
                            <PortalDocuments />
                          </PortalProtectedRoute>
                        }
                      />
                      <Route
                        path="/portal/reimbursements"
                        element={
                          <PortalProtectedRoute>
                            <PortalReimbursements />
                          </PortalProtectedRoute>
                        }
                      />
                      <Route
                        path="/portal/notifications"
                        element={
                          <PortalProtectedRoute>
                            <PortalNotifications />
                          </PortalProtectedRoute>
                        }
                      />
                      <Route
                        path="/portal/tax-forms"
                        element={
                          <PortalProtectedRoute>
                            <PortalTaxForms />
                          </PortalProtectedRoute>
                        }
                      />
                      <Route
                        path="/portal/assets"
                        element={
                          <PortalProtectedRoute>
                            <PortalAssets />
                          </PortalProtectedRoute>
                        }
                      />
                      <Route
                        path="/portal/settings"
                        element={
                          <PortalProtectedRoute>
                            <PortalSettings />
                          </PortalProtectedRoute>
                        }
                      />
                      {/* Protected Routes with Navigation Layout */}
                      <Route
                        element={
                          <ProtectedRoute>
                            <UIDensityProvider>
                              <NavigationLayout />
                            </UIDensityProvider>
                          </ProtectedRoute>
                        }
                      >
                        <Route path="/" element={<Index />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/customers" element={<Customers />} />
                        <Route
                          path="/customers/:id"
                          element={<CustomerDetail />}
                        />
                        <Route path="/projects" element={<Projects />} />
                        <Route path="/projects/:id" element={<ProjectDetail />} />
                        <Route path="/vendors" element={<Vendors />} />
                        <Route path="/vendors/:id" element={<VendorDetail />} />
                        <Route path="/vendor-bills" element={<VendorBills />} />
                        <Route
                          path="/vendor-bills/:id"
                          element={<VendorBillDetail />}
                        />
                        <Route
                          path="/vendor-documents"
                          element={<VendorDocuments />}
                        />
                        <Route path="/jobs" element={<Jobs />} />
                        <Route path="/sales" element={<Sales />} />
                        <Route path="/estimates" element={<Estimates />} />
                        <Route
                          path="/estimates/:id"
                          element={<EstimateDetail />}
                        />
                        {/* Job orders are accessed through project detail - standalone list removed */}
                        <Route
                          path="/job-orders/:id"
                          element={<JobOrderDetail />}
                        />
                        <Route
                          path="/job-orders/:id/edit"
                          element={<EditJobOrder />}
                        />
                        <Route
                          path="/purchase-orders"
                          element={<PurchaseOrders />}
                        />
                        <Route
                          path="/purchase-orders/:id"
                          element={<PurchaseOrderDetail />}
                        />
                        <Route
                          path="/change-orders/new"
                          element={<NewChangeOrder />}
                        />
                        <Route
                          path="/change-orders/:id"
                          element={<ChangeOrderDetail />}
                        />
                        <Route
                          path="/change-orders/:id/edit"
                          element={<EditChangeOrder />}
                        />
                        <Route path="/invoices" element={<Invoices />} />
                        <Route path="/invoices/:id" element={<InvoiceDetail />} />
                        <Route path="/time-tracking" element={<TimeTracking />} />
                        <Route
                          path="/overhead-analysis"
                          element={<OverheadAnalysis />}
                        />
                        <Route path="/reports" element={<Reports />} />
                        <Route
                          path="/team-timesheet"
                          element={<TeamTimesheet />}
                        />
                        <Route
                          path="/reimbursements"
                          element={<Reimbursements />}
                        />
                        <Route
                          path="/project-assignments"
                          element={<ProjectAssignments />}
                        />
                        <Route path="/people" element={<PeopleDirectory />} />
                        <Route path="/personnel" element={<Personnel />} />
                        <Route
                          path="/personnel/:id"
                          element={<PersonnelDetail />}
                        />
                        <Route
                          path="/badge-templates"
                          element={<BadgeTemplates />}
                        />
                        <Route
                          path="/badge-templates/:id"
                          element={<BadgeTemplateEditor />}
                        />
                        <Route
                          path="/settings"
                          element={<Navigate to="/company" replace />}
                        />
                        <Route path="/company" element={<CompanyHub />} />
                        <Route
                          path="/document-center"
                          element={<DocumentCenter />}
                        />
                        <Route
                          path="/user-management"
                          element={<Navigate to="/company" replace />}
                        />
                        <Route
                          path="/permissions"
                          element={<PermissionsManagement />}
                        />
                        <Route
                          path="/settings/quickbooks"
                          element={<QuickBooksSettings />}
                        />
                        <Route
                          path="/settings/expense-categories"
                          element={<ExpenseCategories />}
                        />
                        <Route path="/messages" element={<Messages />} />
                        <Route
                          path="/conversations"
                          element={<Navigate to="/messages" replace />}
                        />
                        <Route
                          path="/notifications"
                          element={<AdminNotifications />}
                        />
                        <Route
                          path="/admin/contractor-submissions"
                          element={<ContractorSubmissions />}
                        />
                        <Route
                          path="/admin/contractor-form-builder"
                          element={<ContractorFormBuilder />}
                        />
                        <Route
                          path="/admin/preview/vendor-portal"
                          element={<VendorPortalPreview />}
                        />
                        <Route
                          path="/admin/preview/personnel-portal"
                          element={<PersonnelPortalPreview />}
                        />
                        <Route path="/admin/audit-logs" element={<AuditLogs />} />
                        <Route
                          path="/admin"
                          element={<Navigate to="/" replace />}
                        />
                        <Route path="/admin/trash" element={<Trash />} />
                        <Route
                          path="/staffing/applications"
                          element={<StaffingApplications />}
                        />
                        <Route
                          path="/staffing/applications/posting/:postingId"
                          element={<JobPostingEntries />}
                        />
                        <Route
                          path="/staffing/form-templates"
                          element={<ApplicationFormTemplates />}
                        />
                        <Route
                          path="/staffing/form-templates/new"
                          element={<ApplicationFormBuilder />}
                        />
                        <Route
                          path="/staffing/form-templates/:id"
                          element={<ApplicationFormBuilder />}
                        />
                        <Route
                          path="/staffing/map"
                          element={<StaffingMapView />}
                        />
                        <Route
                          path="/session-history"
                          element={<SessionHistory />}
                        />
                        <Route
                          path="/activity-history"
                          element={<ActivityHistory />}
                        />
                        <Route path="/ai-dev" element={<AiDevAssistant />} />
                      </Route>

                      {/* Vendor Portal Routes */}
                      <Route path="/vendor/login" element={<VendorLogin />} />
                      <Route
                        path="/vendor/accept-invite/:token"
                        element={<AcceptVendorInvitation />}
                      />
                      <Route
                        path="/vendor"
                        element={
                          <VendorProtectedRoute>
                            <VendorDashboard />
                          </VendorProtectedRoute>
                        }
                      />
                      <Route
                        path="/vendor/pos"
                        element={
                          <VendorProtectedRoute>
                            <VendorPOsList />
                          </VendorProtectedRoute>
                        }
                      />
                      <Route
                        path="/vendor/pos/:id"
                        element={
                          <VendorProtectedRoute>
                            <VendorPODetail />
                          </VendorProtectedRoute>
                        }
                      />
                      <Route
                        path="/vendor/bills"
                        element={
                          <VendorProtectedRoute>
                            <VendorBillsList />
                          </VendorProtectedRoute>
                        }
                      />
                      <Route
                        path="/vendor/bills/new"
                        element={
                          <VendorProtectedRoute>
                            <VendorNewBill />
                          </VendorProtectedRoute>
                        }
                      />
                      <Route
                        path="/vendor/bills/:id"
                        element={
                          <VendorProtectedRoute>
                            <VendorPortalBillDetail />
                          </VendorProtectedRoute>
                        }
                      />
                      <Route
                        path="/vendor/settings"
                        element={
                          <VendorProtectedRoute>
                            <VendorSettings />
                          </VendorProtectedRoute>
                        }
                      />

                      {/* Subcontractor Portal Routes */}
                      <Route
                        path="/subcontractor/login"
                        element={<SubcontractorLogin />}
                      />
                      <Route
                        path="/subcontractor"
                        element={
                          <SubcontractorProtectedRoute>
                            <SubcontractorDashboard />
                          </SubcontractorProtectedRoute>
                        }
                      />
                      <Route
                        path="/subcontractor/purchase-orders"
                        element={
                          <SubcontractorProtectedRoute>
                            <SubcontractorPOList />
                          </SubcontractorProtectedRoute>
                        }
                      />
                      <Route
                        path="/subcontractor/purchase-orders/:id"
                        element={
                          <SubcontractorProtectedRoute>
                            <SubcontractorPODetail />
                          </SubcontractorProtectedRoute>
                        }
                      />
                      <Route
                        path="/subcontractor/bills"
                        element={
                          <SubcontractorProtectedRoute>
                            <SubcontractorBillsList />
                          </SubcontractorProtectedRoute>
                        }
                      />
                      <Route
                        path="/subcontractor/bills/new"
                        element={
                          <SubcontractorProtectedRoute>
                            <SubcontractorNewBill />
                          </SubcontractorProtectedRoute>
                        }
                      />
                      <Route
                        path="/subcontractor/bills/:id"
                        element={
                          <SubcontractorProtectedRoute>
                            <SubcontractorBillDetail />
                          </SubcontractorProtectedRoute>
                        }
                      />
                      <Route
                        path="/subcontractor/completions"
                        element={
                          <SubcontractorProtectedRoute>
                            <SubcontractorCompletions />
                          </SubcontractorProtectedRoute>
                        }
                      />
                      <Route
                        path="/subcontractor/completions/history"
                        element={
                          <SubcontractorProtectedRoute>
                            <SubcontractorCompletionHistory />
                          </SubcontractorProtectedRoute>
                        }
                      />
                      <Route
                        path="/subcontractor/completions/:id"
                        element={
                          <SubcontractorProtectedRoute>
                            <SubcontractorCompletionDetail />
                          </SubcontractorProtectedRoute>
                        }
                      />

                      {/* Admin: Completion Reviews */}
                      <Route
                        path="/completion-reviews"
                        element={
                          <ProtectedRoute>
                            <CompletionReviews />
                          </ProtectedRoute>
                        }
                      />

                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                  {/* Legacy BottomNav + MoreMenu removed — replaced by NavigationLayout */}
                  <ChatInterface />
                  <UpdateNotification />
                </AIAssistantProvider>
              </LocationTrackingProvider>
            </AuthProvider>
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
