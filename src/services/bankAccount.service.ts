// src/services/bankAccount.service.ts

import { LocalStorageService } from './localStorage';
import { BankAccount } from '../types/index';

/**
 * BankAccountService - Handles bank account management operations for admin users
 * 
 * Uses LocalStorageService for data persistence.
 * All operations are scoped to the specific admin user.
 */
export class BankAccountService {
  /**
   * Get all bank accounts for a specific admin user
   */
  static async getAllBankAccounts(adminId: string): Promise<BankAccount[]> {
    try {
      const accounts = await LocalStorageService.getBankAccounts(adminId);
      return accounts;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single bank account by id (only if it belongs to the admin)
   */
  static async getBankAccountById(id: string, adminId: string): Promise<BankAccount | null> {
    try {
      const account = await LocalStorageService.getBankAccountById(id, adminId);
      return account;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get the default bank account for a specific admin user
   */
  static async getDefaultBankAccount(adminId: string): Promise<BankAccount | null> {
    try {
      const account = await LocalStorageService.getDefaultBankAccount(adminId);
      return account;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new bank account for a specific admin user
   */
  static async createBankAccount(accountData: Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>, adminId: string): Promise<BankAccount> {
    try {
      const id = LocalStorageService.generateId();
      const newAccount: BankAccount = {
        ...accountData,
        adminId,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await LocalStorageService.saveBankAccount(newAccount, adminId);
      return newAccount;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update bank account by id (only if it belongs to the admin)
   */
  static async updateBankAccount(id: string, updates: Partial<BankAccount>, adminId: string): Promise<void> {
    try {
      await LocalStorageService.updateBankAccount(id, updates, adminId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete bank account by id (only if it belongs to the admin)
   */
  static async deleteBankAccount(id: string, adminId: string): Promise<void> {
    try {
      await LocalStorageService.deleteBankAccount(id, adminId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Set a bank account as default for a specific admin
   * This will automatically unset all other accounts for that admin as default
   */
  static async setDefaultBankAccount(id: string, adminId: string): Promise<void> {
    try {
      await LocalStorageService.updateBankAccount(id, { isDefault: true }, adminId);
    } catch (error) {
      throw error;
    }
  }
}

