import { supabase } from './supabaseClient';

const auditLogger = {
  log: async (data: any) => {
    console.log("Audit log:", data);
  }
};

export interface Cheque {
  id: string;
  company_id: string;
  cheque_number: string;
  bank_name: string;
  payee_name: string;
  amount: number;
  remaining_amount: number;
  cheque_date: string;
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  type: 'incoming' | 'outgoing';
  created_at?: string;
  updated_at?: string;
}

export interface PaymentLog {
  id: string;
  cheque_id: string;
  amount: number;
  payment_date: string;
  note?: string;
  company_id: string;
  created_at?: string;
}

export const chequeService = {
  async getCheques(companyId: string): Promise<Cheque[]> {
    const { data, error } = await supabase
      .from('cheques')
      .select('*')
      .eq('company_id', companyId)
      .order('cheque_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createCheque(input: Omit<Cheque, 'id' | 'remaining_amount'>): Promise<Cheque> {
    const newCheque = {
      ...input,
      remaining_amount: input.amount,
    };

    const { data, error } = await supabase
      .from('cheques')
      .insert([newCheque])
      .select()
      .single();

    if (error) throw error;

    await auditLogger.log({
      action: 'CREATE_CHEQUE',
      entity: 'cheque',
      entity_id: data.id,
      data: data,
      company_id: input.company_id,
    });

    return data;
  },

  async updateChequeStatus(id: string, newStatus: Cheque['status'], newRemaining: number, input: any): Promise<any> {
    try {
      const updatePayload = {
        status: newStatus,
        remaining_amount: Math.round(newRemaining * 100) / 100,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('cheques')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;

      await auditLogger.log({
        action: 'UPDATE_CHEQUE',
        entity: 'cheque',
        entity_id: id,
        data: input,
        company_id: input.company_id
      });

      return {
        remaining_amount: Math.round(newRemaining * 100) / 100,
        status: newStatus
      };
    } catch (error) {
      console.error("Error updating cheque status:", error);
      throw error;
    }
  }
};

export async function deletePaymentLog(log: PaymentLog) {
  const { error } = await supabase
    .from('payment_logs')
    .delete()
    .eq('id', log.id);

  if (error) throw error;
}
  company_id: string;
  cheque_number: string;
  bank_name: string;
  payee_name: string;
  amount: number;
  remaining_amount: number;
  cheque_date: string;
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  type: 'incoming' | 'outgoing';
  created_at?: string;
  updated_at?: string;
}

export interface PaymentLog {
  id: string;
  cheque_id: string;
  amount: number;
  payment_date: string;
  note?: string;
  company_id: string;
  created_at?: string;
}

export const chequeService = {
  async getCheques(companyId: string): Promise<Cheque[]> {
    const { data, error } = await supabase
      .from('cheques')
      .select('*')
      .eq('company_id', companyId)
      .order('cheque_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createCheque(input: Omit<Cheque, 'id' | 'remaining_amount'>): Promise<Cheque> {
    const newCheque = {
      ...input,
      remaining_amount: input.amount,
    };

    const { data, error } = await supabase
      .from('cheques')
      .insert([newCheque])
      .select()
      .single();

    if (error) throw error;

    await auditLogger.log({
      action: 'CREATE_CHEQUE',
      entity: 'cheque',
      entity_id: data.id,
      data: data,
      company_id: input.company_id,
    });

    return data;
  },

  async updateChequeStatus(id: string, newStatus: Cheque['status'], newRemaining: number, input: any): Promise<any> {
    try {
      const updatePayload = {
        status: newStatus,
        remaining_amount: Math.round(newRemaining * 100) / 100,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('cheques')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;

      await auditLogger.log({
        action: 'UPDATE_CHEQUE',
        entity: 'cheque',
        entity_id: id,
        data: input,
        company_id: input.company_id
      });

      return {
        remaining_amount: Math.round(newRemaining * 100) / 100,
        status: newStatus
      };
    } catch (error) {
      console.error("Error updating cheque status:", error);
      throw error;
    }
  }
};

export async function deletePaymentLog(log: PaymentLog) {
  const { error } = await supabase
    .from('payment_logs')
    .delete()
    .eq('id', log.id);

  if (error) throw error;
}
