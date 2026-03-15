# 🧮 Milk Pricing System Guide

This guide explains how the milk pricing system works based on FAT and SNF percentages.

## 📊 Pricing Formula

The milk rate is calculated using the following formula:

```
Rate = Base Price + ((FAT - Base FAT) × FAT Rate) + ((SNF - Base SNF) × SNF Rate) + Bonus
```

## 🐄 Cow Milk Pricing

**Base Configuration:**
- Base FAT: **3.5%**
- Base SNF: **8.5%**
- Base Price: **₹36.00**
- FAT Rate: **₹5.0 per 1%** (₹0.50 per 0.1%)
- SNF Rate: **₹5.0 per 1%** (₹0.50 per 0.1%)
- Bonus: **₹1.00**

**Example Calculations:**

1. **3.5 FAT, 8.5 SNF** (Base):
   - Rate = 36 + ((3.5-3.5)×5) + ((8.5-8.5)×5) + 1 = **₹37.00/Litre**

2. **4.0 FAT, 8.5 SNF**:
   - Rate = 36 + ((4.0-3.5)×5) + ((8.5-8.5)×5) + 1 = 36 + 2.5 + 0 + 1 = **₹39.50/Litre**

3. **3.5 FAT, 9.0 SNF**:
   - Rate = 36 + ((3.5-3.5)×5) + ((9.0-8.5)×5) + 1 = 36 + 0 + 2.5 + 1 = **₹39.50/Litre**

4. **4.5 FAT, 9.0 SNF**:
   - Rate = 36 + ((4.5-3.5)×5) + ((9.0-8.5)×5) + 1 = 36 + 5 + 2.5 + 1 = **₹44.50/Litre**

## 🐃 Buffalo Milk Pricing

**Base Configuration:**
- Base FAT: **6.0%**
- Base SNF: **9.0%**
- Base Price: **₹51.00**
- FAT Rate: **₹5.0 per 1%** (₹0.50 per 0.1%)
- SNF Rate: **₹5.0 per 1%** (₹0.50 per 0.1%)
- Bonus: **₹1.00**

**Example Calculations:**

1. **6.0 FAT, 9.0 SNF** (Base):
   - Rate = 51 + ((6.0-6.0)×5) + ((9.0-9.0)×5) + 1 = **₹52.00/Litre**

2. **7.0 FAT, 9.0 SNF**:
   - Rate = 51 + ((7.0-6.0)×5) + ((9.0-9.0)×5) + 1 = 51 + 5 + 0 + 1 = **₹57.00/Litre**

3. **6.0 FAT, 9.5 SNF**:
   - Rate = 51 + ((6.0-6.0)×5) + ((9.5-9.0)×5) + 1 = 51 + 0 + 2.5 + 1 = **₹54.50/Litre**

4. **8.0 FAT, 9.2 SNF**:
   - Rate = 51 + ((8.0-6.0)×5) + ((9.2-9.0)×5) + 1 = 51 + 10 + 1 + 1 = **₹63.00/Litre**

## 📅 Setting Daily Prices

Admin can set different base prices for each day. The base price, FAT rate, and SNF rate can be adjusted daily.

### API Endpoint

**POST** `/api/milk-price`

**Request Body:**
```json
{
  "price_date": "2025-11-24",
  "milk_type": "cow",
  "base_price": 36.00,
  "base_fat": 3.5,
  "base_snf": 8.5,
  "fat_rate": 5.0,
  "snf_rate": 5.0,
  "bonus": 1.00,
  "notes": "Daily price for cow milk"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Milk price set successfully",
  "data": {
    "id": "...",
    "price_date": "2025-11-24",
    "base_price": 36.00,
    "base_fat": 3.5,
    "base_snf": 8.5,
    "fat_rate": 5.0,
    "snf_rate": 5.0,
    "bonus": 1.00,
    "milk_type": "cow",
    "is_active": true
  }
}
```

## 🔍 Price Preview

You can preview the rate for any FAT/SNF combination before creating a collection:

**GET** `/api/milk-price/preview?milk_type=cow&fat_percentage=4.0&snf_percentage=8.5`

**Response:**
```json
{
  "success": true,
  "data": {
    "rate": 39.50,
    "price": {
      "base_price": 36.00,
      "base_fat": 3.5,
      "base_snf": 8.5,
      "fat_rate": 5.0,
      "snf_rate": 5.0,
      "bonus": 1.00
    }
  }
}
```

## 📝 Notes

1. **Daily Base Prices**: Each milk type (cow, buffalo, mix_milk) can have different base prices set daily.

2. **Rate Calculation**: The system automatically calculates the rate when a milk collection is created based on the FAT and SNF percentages entered.

3. **Rounding**: All rates are rounded to 2 decimal places.

4. **Mix Milk**: For mixed milk, you can set a separate base configuration or use an average of cow and buffalo rates.

5. **Historical Prices**: All price changes are logged in the `activity_logs` table for audit purposes.

## 🎯 Quick Reference

| Milk Type | Base FAT | Base SNF | Base Price | FAT Rate | SNF Rate | Bonus | Base Rate |
|-----------|----------|----------|------------|----------|----------|-------|-----------|
| Cow       | 3.5%     | 8.5%     | ₹36.00     | ₹5.0/%   | ₹5.0/%   | ₹1.00 | ₹37.00    |
| Buffalo   | 6.0%     | 9.0%     | ₹51.00     | ₹5.0/%   | ₹5.0/%   | ₹1.00 | ₹52.00    |

---

**Formula Summary:**
```
Rate = Base Price + ((FAT - Base FAT) × 5.0) + ((SNF - Base SNF) × 5.0) + Bonus
```



