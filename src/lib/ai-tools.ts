import * as db from '@/lib/db';

export const searchParts = db.searchPartsSQL;
export const getPart = db.getPartSQL;
export const getCurrentPrice = db.getCurrentPriceSQL;
export const searchPrices = db.searchPricesSQL;
export const getPriceHistory = db.getPriceHistorySQL;
export const checkCompatibility = db.checkCompatibilitySQL;
export const findRelatedParts = db.findRelatedPartsSQL;
export const getEngineeringKnowledge = db.getEngineeringKnowledgeSQL;
export const searchManufacturer = db.searchManufacturerSQL;
export const recordFeedback = db.recordFeedbackSQL;

export const formatStock = db.formatStock;
export const formatSearchResults = db.formatSearchResults;
export const formatRecommendations = db.formatRecommendations;