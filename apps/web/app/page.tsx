//@ts-ignore

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getFormattedErrorMessage } from "@formbricks/lib/actionClient/helper";
import { templates } from "@formbricks/lib/templates";
import type { TEnvironment } from "@formbricks/types/environment";
import { type TProduct, ZProductConfigIndustry } from "@formbricks/types/product";
import { TSurveyCreateInput, ZSurveyType } from "@formbricks/types/surveys/types";
import { TTemplate, TTemplateFilter, ZTemplateRole } from "@formbricks/types/templates";
import { TUser } from "@formbricks/types/user";
import { StartFromScratchTemplate } from "@formbricks/ui/TemplateList/components/StartFromScratchTemplate";
import { TemplateFilters } from "@formbricks/ui/TemplateList/components/TemplateFilters";
import { Template } from "@formbricks/ui/TemplateList/components/Template";
import { createSurveyAction } from "@formbricks/ui/TemplateList/actions";

interface TemplateListProps {
  user: TUser;
  environment: TEnvironment;
  product: TProduct;
  templateSearch?: string;
  prefilledFilters: TTemplateFilter[];
  onTemplateClick?: (template: TTemplate) => void;
}

const defaultEnvironment: TEnvironment = {
  id: "default-env-id", // Placeholder; replace with actual logic if needed
  createdAt: new Date(), // Default to the current date
  updatedAt: new Date(), // Default to the current date
  type: "development", // Default to 'development'; change to 'production' if needed
  productId: "default-product-id", // Placeholder; replace with actual logic if needed
  appSetupCompleted: false, // Default to false indicating setup is not completed
  websiteSetupCompleted: false, // Default to false indicating setup is not completed
}

const defaultUser: TUser = {
  id: "default-id",
  name: "Default Name",
  email: "default@example.com",
  emailVerified: null, // or provide a default date if needed
  imageUrl: null,
  twoFactorEnabled: false,
  identityProvider: "email", // default to one of the valid enums
  createdAt: new Date(),
  updatedAt: new Date(),
  role: null, // or provide a default role if needed
  objective: null, // or provide a default objective if needed
  notificationSettings: {
    alert: {
      // Default settings for alerts; adjust according to your needs
      email: true,
      sms: false,
      push: true,
    },
    weeklySummary: {
      // Default settings for weekly summaries; adjust according to your needs
      email: true,
      sms: false,
      push: false,
    },
    unsubscribedOrganizationIds: [],
  },
}

const defaultProduct: TProduct = {
  id: "default-prd-id",
  createdAt: new Date(),
  updatedAt: new Date(),
  config: {
    channel: null,
    industry: null,
  },
  name: "Default Product Name",
  organizationId: "default-org-id",
  styling: {
    allowStyleOverwrite: true,
  brandColor: {
    light: "#ffffff",
    dark: "#000000",
  },
  questionColor: {
    light: "#cccccc",
  },
  }, // Add default values if needed
  recontactDays: 0,
  inAppSurveyBranding: false,
  linkSurveyBranding: false,
  placement: "topRight", 
  clickOutsideClose: false,
  darkOverlay: false,
  environments: [], // Add default values if needed
  languages: [], // Add default values if needed
  logo: null, // Default value for ZLogo.nullish()
};

const Page = ({
  user = defaultUser,
  product = defaultProduct,
  environment = defaultEnvironment,
  templateSearch,
  prefilledFilters,
  onTemplateClick = () => {},
}: TemplateListProps) => {
  const router = useRouter();
  const [activeTemplate, setActiveTemplate] = useState<TTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<TTemplateFilter[]>(prefilledFilters);

  const createSurvey = async (activeTemplate: TTemplate) => {
    setLoading(true);

     // Check if product is defined
  if (!product || !product.config) {
    console.error('Product or Product config is undefined');
    toast.error('Product configuration is missing.');
    setLoading(false);
    return;
  }

  if (!user || !user.id) {
    console.error('User is undefined or user ID is missing');
    toast.error('User information is missing.');
    setLoading(false);
    return;
  }

  if (!environment || !environment.id) {
    console.error('Environment is undefined or environment ID is missing');
    toast.error('Environment information is missing.');
    setLoading(false);
    return;
  }


    console.log("Productsssssssss", product)

    // Check if product.config is defined
    if (!product.config) {
      console.error('Product config is undefined');
      toast.error('Product configuration is missing.');
      setLoading(false);
      return;
    }

    const surveyType = product.config.channel ?? "link";
    const augmentedTemplate: TSurveyCreateInput = {
      ...activeTemplate.preset,
      type: surveyType,
      createdBy: user.id,
    };

    try {
      const createSurveyResponse = await createSurveyAction({
        environmentId: environment.id,
        surveyBody: augmentedTemplate,
      });

      if (createSurveyResponse?.data) {
        router.push(`/environments/${environment.id}/surveys/${createSurveyResponse.data.id}/edit`);
      } else {
        const errorMessage = getFormattedErrorMessage(createSurveyResponse);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error creating survey:', error);
      toast.error('Failed to create survey.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      if (templateSearch) {
        return template.name.toLowerCase().startsWith(templateSearch.toLowerCase());
      }

      // Parse and validate the filters
      const channelParseResult = ZSurveyType.nullable().safeParse(selectedFilter);
      const industryParseResult = ZProductConfigIndustry.nullable().safeParse(selectedFilter);
      const roleParseResult = ZTemplateRole.nullable().safeParse(selectedFilter);

      // Ensure all validations are successful
      if (!channelParseResult.success || !industryParseResult.success || !roleParseResult.success) {
        return true; // If any validation fails, skip this template
      }

      // Access the validated data from the parse results
      const validatedChannel = channelParseResult.data;
      const validatedIndustry = industryParseResult.data;
      const validatedRole = roleParseResult.data;

      // Perform the filtering
      const channelMatch = validatedChannel === null || template.channels?.includes(validatedChannel);
      const industryMatch = validatedIndustry === null || template.industries?.includes(validatedIndustry);
      const roleMatch = validatedRole === null || template.role === validatedRole;

      return channelMatch && industryMatch && roleMatch;
    });
  }, [selectedFilter, templateSearch]);

  return (
    <main className="relative z-0 flex-1 overflow-y-auto px-6 pb-6 focus:outline-none">
      {!templateSearch && (
        <TemplateFilters
          selectedFilter={selectedFilter}
          setSelectedFilter={setSelectedFilter}
          templateSearch={templateSearch}
          prefilledFilters={prefilledFilters}
        />
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StartFromScratchTemplate
          activeTemplate={activeTemplate}
          setActiveTemplate={setActiveTemplate}
          onTemplateClick={onTemplateClick}
          product={product}
          createSurvey={createSurvey}
          loading={loading}
        />
        {(process.env.NODE_ENV === "development" ? [...filteredTemplates] : filteredTemplates).map(
          (template: TTemplate) => (
            <Template
              template={template}
              activeTemplate={activeTemplate}
              setActiveTemplate={setActiveTemplate}
              onTemplateClick={onTemplateClick}
              product={product}
              createSurvey={createSurvey}
              loading={loading}
              selectedFilter={selectedFilter}
            />
          )
        )}
      </div>
    </main>
  );
};

export default Page;
