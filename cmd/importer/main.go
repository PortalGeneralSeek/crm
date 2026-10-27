package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"crm-backend/config"
	"crm-backend/internal/database"
	"crm-backend/internal/model"
)

type ContactItem struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Role      string `json:"role"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
	Type      string `json:"type"`
	IsPrimary bool   `json:"isPrimary"`
}

func parseValues(line string) []string {
	start := strings.Index(line, "VALUES (")
	if start == -1 {
		return nil
	}
	content := strings.TrimSpace(line[start+8:])
	content = strings.TrimSuffix(content, ";")
	content = strings.TrimSuffix(content, ")")

	var tokens []string
	var current strings.Builder
	inStr := false
	escape := false

	for i := 0; i < len(content); i++ {
		ch := content[i]
		if escape {
			current.WriteByte(ch)
			escape = false
		} else if ch == '\\' {
			escape = true
		} else if ch == '\'' {
			inStr = !inStr
		} else if ch == ',' && !inStr {
			tokens = append(tokens, cleanField(current.String()))
			current.Reset()
		} else {
			current.WriteByte(ch)
		}
	}
	if current.Len() > 0 {
		tokens = append(tokens, cleanField(current.String()))
	}
	return tokens
}

func cleanField(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "'") && strings.HasSuffix(s, "'") && len(s) >= 2 {
		s = s[1 : len(s)-1]
	}
	s = strings.ReplaceAll(s, "\\'", "'")
	s = strings.ReplaceAll(s, "\\\"", "\"")
	s = strings.ReplaceAll(s, "\\\\", "\\")
	if s == "-" || s == "null" || s == "NULL" {
		return ""
	}
	return strings.TrimSpace(s)
}

func mapBranch(province string) string {
	switch {
	case strings.Contains(province, "上海") || strings.Contains(province, "江苏") || strings.Contains(province, "浙江") || strings.Contains(province, "安徽") || strings.Contains(province, "山东"):
		return "华东分公司"
	case strings.Contains(province, "广东") || strings.Contains(province, "广西") || strings.Contains(province, "海南") || strings.Contains(province, "福建"):
		return "华南分公司"
	case strings.Contains(province, "北京") || strings.Contains(province, "天津") || strings.Contains(province, "河北") || strings.Contains(province, "山西") || strings.Contains(province, "内蒙古"):
		return "华北分公司"
	case strings.Contains(province, "湖北") || strings.Contains(province, "湖南") || strings.Contains(province, "河南") || strings.Contains(province, "江西"):
		return "华中分公司"
	case strings.Contains(province, "四川") || strings.Contains(province, "重庆") || strings.Contains(province, "云南") || strings.Contains(province, "贵州") || strings.Contains(province, "西藏"):
		return "西南分公司"
	case strings.Contains(province, "陕西") || strings.Contains(province, "甘肃") || strings.Contains(province, "青海") || strings.Contains(province, "宁夏") || strings.Contains(province, "新疆"):
		return "西北分公司"
	case strings.Contains(province, "辽宁") || strings.Contains(province, "吉林") || strings.Contains(province, "黑龙江"):
		return "东北分公司"
	default:
		return "华东分公司"
	}
}

func mapTier(capital string) string {
	if strings.Contains(capital, "亿") || strings.Contains(capital, "美元") {
		return "VIP"
	}
	var num float64
	_, _ = fmt.Sscanf(capital, "%f", &num)
	if num >= 10000 {
		return "VIP"
	} else if num >= 3000 {
		return "KA"
	}
	return "SMB"
}

func buildContacts(legalPerson, phone, morePhone, email, moreEmail string) (string, string, string, string) {
	var contacts []ContactItem
	contactIndex := 1

	seenPhones := make(map[string]bool)
	seenEmails := make(map[string]bool)

	// 1. Primary Contact (Legal Person / Key Contact)
	primaryName := legalPerson
	if primaryName == "" {
		primaryName = "主要联系人"
	}
	primaryRole := "法定代表人 / 执行董事"
	if legalPerson == "" {
		primaryRole = "销售主对接人"
	}

	primaryPhone := phone
	if primaryPhone != "" {
		seenPhones[primaryPhone] = true
	}
	primaryEmail := email
	if primaryEmail != "" {
		seenEmails[primaryEmail] = true
	}

	contacts = append(contacts, ContactItem{
		ID:        fmt.Sprintf("ct-%d", contactIndex),
		Name:      primaryName,
		Role:      primaryRole,
		Phone:     primaryPhone,
		Email:     primaryEmail,
		Type:      "法定代表人",
		IsPrimary: true,
	})
	contactIndex++

	// 2. Parse more emails
	var extraEmails []string
	if moreEmail != "" {
		parts := strings.FieldsFunc(moreEmail, func(r rune) bool {
			return r == ';' || r == '；' || r == ',' || r == '，' || r == '\n' || r == ' '
		})
		for _, e := range parts {
			e = strings.TrimSpace(e)
			if e != "" && e != "-" && !seenEmails[e] {
				seenEmails[e] = true
				extraEmails = append(extraEmails, e)
			}
		}
	}

	// 3. Parse more phones
	emailIdx := 0
	if morePhone != "" {
		parts := strings.FieldsFunc(morePhone, func(r rune) bool {
			return r == ';' || r == '；' || r == ',' || r == '，' || r == '\n' || r == ' '
		})
		roleNames := []string{"商务总机 / 前台", "业务对接 / 项目经理", "财务结算部", "工程采购部", "市场拓展部", "售后咨询热线"}
		typeNames := []string{"公司总机", "业务手机", "财务电话", "采购专线", "商务热线", "客服电话"}

		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p == "" || p == "-" || seenPhones[p] {
				continue
			}
			seenPhones[p] = true

			rName := roleNames[(contactIndex-2)%len(roleNames)]
			tName := typeNames[(contactIndex-2)%len(typeNames)]
			if strings.HasPrefix(p, "1") && len(p) == 11 {
				tName = "手机移动端"
				rName = "项目现场总监"
			} else if strings.HasPrefix(p, "0") {
				tName = "企业固话"
			}

			cEmail := ""
			if emailIdx < len(extraEmails) {
				cEmail = extraEmails[emailIdx]
				emailIdx++
			}

			contacts = append(contacts, ContactItem{
				ID:        fmt.Sprintf("ct-%d", contactIndex),
				Name:      fmt.Sprintf("联系人-%02d", contactIndex),
				Role:      rName,
				Phone:     p,
				Email:     cEmail,
				Type:      tName,
				IsPrimary: false,
			})
			contactIndex++
		}
	}

	// 4. Remaining extra emails
	for emailIdx < len(extraEmails) {
		contacts = append(contacts, ContactItem{
			ID:        fmt.Sprintf("ct-%d", contactIndex),
			Name:      "官方对外联络",
			Role:      "企业公开邮箱",
			Phone:     "",
			Email:     extraEmails[emailIdx],
			Type:      "电子邮箱",
			IsPrimary: false,
		})
		contactIndex++
		emailIdx++
	}

	// If primary contact had no phone, pick first available phone from other contacts
	if primaryPhone == "" && len(contacts) > 1 {
		for _, c := range contacts[1:] {
			if c.Phone != "" {
				primaryPhone = c.Phone
				break
			}
		}
	}

	bytes, _ := json.Marshal(contacts)
	return string(bytes), primaryName, primaryPhone, primaryEmail
}

func enrichExistingCustomers() {
	var list []model.CrmCustomer
	database.DB.Where("id <= 15").Find(&list)
	for _, c := range list {
		if c.Contacts == "" || c.Contacts == "[]" {
			contactsJSON, _, _, _ := buildContacts(
				c.ContactName,
				c.ContactPhone,
				"021-68885566;010-88996655",
				"contact@"+strings.ToLower(c.Name)+".com",
				"service@enterprise.cn;billing@enterprise.cn",
			)
			c.Contacts = contactsJSON
			c.ContactEmail = "contact@" + strings.ToLower(c.Name) + ".com"
			c.LegalPerson = c.ContactName
			c.RegistCapital = "50000万元人民币"
			c.RegistStatus = "存续"
			c.EstablishDate = "2015-06-18"
			c.ApprovalDate = "2023-01-10"
			c.Province = "广东"
			c.City = "深圳市"
			c.District = "南山区"
			c.SocialCode = fmt.Sprintf("91440300MA5%06dF", c.ID)
			c.TaxpayerCode = c.SocialCode
			c.RegistCode = fmt.Sprintf("440300%09d", c.ID)
			c.OrgCode = fmt.Sprintf("MA5%05d-%d", c.ID, c.ID%10)
			c.InsuredTotal = "1280"
			c.EnterpriseType = "股份有限公司（上市、国有控股）"
			c.EnterpriseAddress = "深圳市高新技术产业园区科技南路168号"
			c.Website = "https://www.acme-corp.com"
			c.Business = "企业级软件研发、大数据分析服务、人工智能算法集成、云计算基础设施服务、技术咨询与运营支持。（依法须经批准的项目，经相关部门批准后方可开展经营活动）"
			c.SysTag = "重点客户;行业标杆"
			database.DB.Save(&c)
		}
	}
	log.Printf("[Importer] Enriched %d existing customers with full QCC details.", len(list))
}

func main() {
	cfg := config.LoadConfig()
	_, err := database.InitMySQL(cfg)
	if err != nil {
		log.Fatalf("Init MySQL failed: %v", err)
	}

	// 1. Enrich existing customers first
	enrichExistingCustomers()

	// 2. Open SQL dump file
	sqlFilePath := "/data/crm/advanced_query_qcc_ja.sql"
	file, err := os.Open(sqlFilePath)
	if err != nil {
		log.Fatalf("Failed to open %s: %v", sqlFilePath, err)
	}
	defer file.Close()

	log.Printf("[Importer] Starting stream parsing from %s ...", sqlFilePath)

	scanner := bufio.NewScanner(file)
	// Allow large lines (up to 4MB per line)
	buf := make([]byte, 1024*1024)
	scanner.Buffer(buf, 4*1024*1024)

	const targetCount = 20000 // Import 20,000 comprehensive enterprise records
	const batchSize = 1000

	var batch []model.CrmCustomer
	importedCount := 0
	startTime := time.Now()

	// Pre-load user IDs for assignment
	// ID 1: admin, ID 2: director, ID 3: rep
	userRepID := uint(3)
	userRepName := "林雪 (客户经理 · 一线销售)"
	userDirectorID := uint(2)
	userDirectorName := "陈明 (销售总监)"
	userAdminID := uint(1)
	userAdminName := "Sarah Jenkins (超级管理员)"

	now := time.Now()

	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "INSERT INTO `advanced_query_qcc_ja` VALUES (") &&
			!strings.HasPrefix(line, "INSERT INTO advanced_query_qcc_ja VALUES (") {
			continue
		}

		vals := parseValues(line)
		if len(vals) < 28 {
			continue
		}

		enterpriseName := vals[1]
		if enterpriseName == "" {
			continue
		}

		registStatus := vals[2]
		legalPerson := vals[3]
		registCapital := vals[4]
		establishDate := vals[5]
		approvalDate := vals[6]
		province := vals[7]
		city := vals[8]
		district := vals[9]
		phone := vals[10]
		morePhone := vals[11]
		email := vals[12]
		moreEmail := vals[13]
		socialCode := vals[14]
		taxpayerCode := vals[15]
		registCode := vals[16]
		orgCode := vals[17]
		insuredTotal := vals[18]
		enterpriseType := vals[19]
		industryType := vals[20]
		oldName := vals[21]
		englishName := vals[22]
		website := vals[23]
		enterpriseAddress := vals[24]
		reportSite := vals[25]
		business := vals[26]
		sysTag := vals[27]

		if registStatus == "" {
			registStatus = "存续"
		}
		if industryType == "" {
			industryType = sysTag
		}
		if industryType == "" {
			industryType = "建筑安装工程"
		}

		branch := mapBranch(province)
		tier := mapTier(registCapital)

		// Contacts matrix
		contactsJSON, contactName, contactPhone, contactEmail := buildContacts(legalPerson, phone, morePhone, email, moreEmail)

		// Pool Type allocation:
		// 40% into Public Sea
		// 60% into Private Pool
		isPublicSea := (importedCount % 5 < 2)
		var poolType string
		var ownerID uint
		var ownerName string

		if isPublicSea {
			poolType = "branch_public"
			ownerID = 0
			ownerName = ""
		} else {
			poolType = "private"
			switch importedCount % 10 {
			case 2, 3, 4, 5, 6, 7:
				ownerID = userRepID
				ownerName = userRepName
			case 8:
				ownerID = userDirectorID
				ownerName = userDirectorName
			default:
				ownerID = userAdminID
				ownerName = userAdminName
			}
		}

		customer := model.CrmCustomer{
			Name:              enterpriseName,
			Industry:          industryType,
			Tier:              tier,
			Branch:            branch,
			IsPublicSea:       isPublicSea,
			PoolType:          poolType,
			ContactName:       contactName,
			ContactPhone:      contactPhone,
			ContactEmail:      contactEmail,
			OwnerID:           ownerID,
			OwnerName:         ownerName,
			LegalPerson:       legalPerson,
			RegistCapital:     registCapital,
			RegistStatus:      registStatus,
			EstablishDate:     establishDate,
			ApprovalDate:      approvalDate,
			Province:          province,
			City:              city,
			District:          district,
			EnterpriseAddress: enterpriseAddress,
			ReportSite:        reportSite,
			Website:           website,
			SocialCode:        socialCode,
			TaxpayerCode:      taxpayerCode,
			RegistCode:        registCode,
			OrgCode:           orgCode,
			InsuredTotal:      insuredTotal,
			EnterpriseType:    enterpriseType,
			EnglishName:       englishName,
			OldName:           oldName,
			Business:          business,
			SysTag:            sysTag,
			Contacts:          contactsJSON,
			CreatedAt:         now,
			UpdatedAt:         now,
		}

		batch = append(batch, customer)
		importedCount++

		if len(batch) >= batchSize {
			if err := database.DB.CreateInBatches(batch, batchSize).Error; err != nil {
				log.Fatalf("Batch insert failed: %v", err)
			}
			log.Printf("[Importer] Inserted %d / %d records (elapsed: %v)...", importedCount, targetCount, time.Since(startTime).Round(time.Millisecond))
			batch = batch[:0]
		}

		if importedCount >= targetCount {
			break
		}
	}

	if len(batch) > 0 {
		if err := database.DB.CreateInBatches(batch, len(batch)).Error; err != nil {
			log.Fatalf("Final batch insert failed: %v", err)
		}
	}

	log.Printf("[Importer] SUCCESSFULLY imported %d enterprise customers in %v!", importedCount, time.Since(startTime))
}
