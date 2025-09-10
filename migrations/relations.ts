import { relations } from "drizzle-orm/relations";
import { apiEndpoints, savedRequests, users, endpointCategories, rruffMinerals, rruffSpectra } from "./schema";

export const savedRequestsRelations = relations(savedRequests, ({one}) => ({
	apiEndpoint: one(apiEndpoints, {
		fields: [savedRequests.endpointId],
		references: [apiEndpoints.id]
	}),
	user: one(users, {
		fields: [savedRequests.userId],
		references: [users.id]
	}),
}));

export const apiEndpointsRelations = relations(apiEndpoints, ({one, many}) => ({
	savedRequests: many(savedRequests),
	endpointCategory: one(endpointCategories, {
		fields: [apiEndpoints.categoryId],
		references: [endpointCategories.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	savedRequests: many(savedRequests),
}));

export const endpointCategoriesRelations = relations(endpointCategories, ({many}) => ({
	apiEndpoints: many(apiEndpoints),
}));

export const rruffSpectraRelations = relations(rruffSpectra, ({one}) => ({
	rruffMineral: one(rruffMinerals, {
		fields: [rruffSpectra.mineralId],
		references: [rruffMinerals.id]
	}),
}));

export const rruffMineralsRelations = relations(rruffMinerals, ({many}) => ({
	rruffSpectras: many(rruffSpectra),
}));