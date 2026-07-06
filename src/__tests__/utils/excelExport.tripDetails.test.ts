/**
 * Trip details Excel export tests
 */

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock/',
  cacheDirectory: 'file:///mock-cache/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { exportTripDetailsToExcel } from '../../utils/excelExport';
import { SocietyTrip } from '../../services/societyTrip.service';
import { buildTankerSizeBreakdown } from '../../utils/societyTripBreakdown';

const createTrip = (
  id: string,
  overrides: Partial<SocietyTrip> = {},
): SocietyTrip => ({
  id,
  customerId: 'customer-1',
  agencyName: 'Test Agency',
  agencyAdminId: 'admin-1',
  scheduledAt: new Date(2026, 4, 10, 14, 30),
  tankerSizeLiters: 10000,
  tankerAmount: 2500,
  photoUrls: [],
  createdAt: new Date(2026, 4, 10, 14, 30),
  ...overrides,
});

describe('exportTripDetailsToExcel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes CSV with summary, breakdown, and trip rows then shares the file', async () => {
    const trips = [
      createTrip('trip-1'),
      createTrip('trip-2', { tankerSizeLiters: 15000, tankerAmount: 3000 }),
    ];
    const breakdown = buildTankerSizeBreakdown(trips, undefined);

    await exportTripDetailsToExcel(trips, 2026, 4, {
      societyUserLabel: 'All society users',
      tankerBreakdown: breakdown,
      grandTotalAmount: 5500,
      getSocietyUserDisplay: () => 'Society User A',
      getTripPaymentStatus: () => 'Payment pending',
    });

    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledTimes(1);
    const [fileUri, csvContent] = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
    expect(fileUri).toBe('file:///mock/TripDetails_May_2026.csv');
    expect(csvContent).toContain('Summary');
    expect(csvContent).toContain('May 2026');
    expect(csvContent).toContain('All society users');
    expect(csvContent).toContain('Total Trips,"2"');
    expect(csvContent).toContain('Trips by Tanker Size');
    expect(csvContent).toContain('Trip Details');
    expect(csvContent).toContain('Test Agency');
    expect(csvContent).toContain('Payment pending');

    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      'file:///mock/TripDetails_May_2026.csv',
      expect.objectContaining({
        mimeType: 'text/csv',
        dialogTitle: 'Export May 2026 Trip Details',
      }),
    );
  });

  it('exports empty trip list without throwing', async () => {
    const breakdown = buildTankerSizeBreakdown([], undefined);

    await exportTripDetailsToExcel([], 2026, 4, {
      societyUserLabel: 'All society users',
      tankerBreakdown: breakdown,
      grandTotalAmount: 0,
      getSocietyUserDisplay: () => '',
      getTripPaymentStatus: () => 'Unknown',
    });

    const [, csvContent] = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
    expect(csvContent).toContain('Total Trips,"0"');
    expect(csvContent).toContain('Trip Details');
    expect(csvContent).toContain('No data available');
  });
});
