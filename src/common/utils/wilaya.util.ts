import { BadRequestException } from '@nestjs/common';
import { ALGERIA_WILAYAS, WILAYA_BY_NUMBER } from '../constants/wilayas';

export const sanitizeWilayaInput = (
  wilayaNumber?: number,
  wilayaFullName?: string,
) => {
  if (!wilayaNumber && !wilayaFullName) {
    return { wilayaNumber: null, wilayaFullName: null };
  }

  if (wilayaNumber) {
    const record = WILAYA_BY_NUMBER.get(wilayaNumber);
    if (!record) {
      throw new BadRequestException('Invalid wilaya number provided');
    }
    return { wilayaNumber: record.number, wilayaFullName: record.name };
  }

  const normalizedName = wilayaFullName?.trim().toLowerCase();
  const found = ALGERIA_WILAYAS.find(
    (wilaya) => wilaya.name.toLowerCase() === normalizedName,
  );

  if (!found) {
    throw new BadRequestException('Invalid wilaya name provided');
  }

  return { wilayaNumber: found.number, wilayaFullName: found.name };
};
