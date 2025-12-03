// src/services/bankAccount.service.ts

import { LocalStorageService } from './localStorage';
import { BankAccount } from '../types/index';

/**
 * BankAccountService - Handles bank account management operations for admin users
 * 
 * Uses LocalStorageService for data persistence.
 */
export class BankAccountService {
  /**
   * Get all bank accounts
   */
  static async getAllBankAccounts(): Promise<BankAccount[]> {
    try {
      const accounts = await LocalStorageService.getBankAccounts();
      return accounts;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single bank account by id
   */
  static async getBankAccountById(id: string): Promise<BankAccount | null> {
    try {
      const account = await LocalStorageService.getBankAccountById(id);
      return account;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get the default bank account
   */
  static async getDefaultBankAccount(): Promise<BankAccount | null> {
    try {
      const account = await LocalStorageService.getDefaultBankAccount();
      return account;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new bank account
   */
  static async createBankAccount(accountData: Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<BankAccount> {
    try {
      const id = LocalStorageService.generateId();
      const newAccount: BankAccount = {
        ...accountData,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await LocalStorageService.saveBankAccount(newAccount);
      return newAccount;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update bank account by id
   */
  static async updateBankAccount(id: string, updates: Partial<BankAccount>): Promise<void> {
    try {
      await LocalStorageService.updateBankAccount(id, updates);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete bank account by id
   */
  static async deleteBankAccount(id: string): Promise<void> {
    try {
      await LocalStorageService.deleteBankAccount(id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Set a bank account as default
   * This will automatically unset all other accounts as default
   */
  static async setDefaultBankAccount(id: string): Promise<void> {
    try {
      await LocalStorageService.updateBankAccount(id, { isDefault: true });
    } catch (error) {
      throw error;
    }
  }
}

