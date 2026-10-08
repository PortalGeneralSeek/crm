package service

import (
	"fmt"
	"strings"

	"crm-backend/internal/database"
	"crm-backend/internal/model"
)

type AiService struct {
	audit *AuditService
}

func NewAiService() *AiService {
	return &AiService{
		audit: NewAuditService(),
	}
}

type AiChatResponse struct {
	Answer      string                 `json:"answer"`
	DataSummary map[string]interface{} `json:"dataSummary,omitempty"`
	ActionType  string                 `json:"actionType,omitempty"`
}

func (s *AiService) Chat(prompt string, userID uint, username, roleName, ip string) (*AiChatResponse, error) {
	promptLower := strings.ToLower(prompt)

	// Fetch live CRM data for context awareness
	var dealCount, leadCount, contractCount int64
	database.DB.Model(&model.CrmDeal{}).Count(&dealCount)
	database.DB.Model(&model.CrmLead{}).Count(&leadCount)
	database.DB.Model(&model.CrmContract{}).Count(&contractCount)

	var totalDealAmount, totalContractAmount float64
	database.DB.Model(&model.CrmDeal{}).Select("COALESCE(SUM(amount), 0)").Scan(&totalDealAmount)
	database.DB.Model(&model.CrmContract{}).Select("COALESCE(SUM(amount), 0)").Scan(&totalContractAmount)

	var topDeals []model.CrmDeal
	database.DB.Order("amount DESC").Limit(3).Find(&topDeals)

	var pendingContracts []model.CrmContract
	database.DB.Where("status = ?", "pending_approval").Find(&pendingContracts)

	var answer strings.Builder
	actionType := "general"

	if strings.Contains(promptLower, "商机") || strings.Contains(promptLower, "业绩") || strings.Contains(promptLower, "漏斗") {
		actionType = "deal_analysis"
		answer.WriteString("### 📊 领航 CRM · 实时商机与业绩智能分析报告\n\n")
		answer.WriteString(fmt.Sprintf("当前系统中正在推进的商机共 **%d** 笔，商机管道总规模达 **¥%.2f**。\n\n", dealCount, totalDealAmount))
		answer.WriteString("#### 🚀 核心头部重点商机盘点：\n")
		for i, d := range topDeals {
			answer.WriteString(fmt.Sprintf("%d. **%s**（%s）— 金额: `¥%.2f` | 阶段: `%s` | 赢单率: `%d%%`\n", i+1, d.Name, d.CustomerName, d.Amount, d.Stage, d.Probability))
		}
		answer.WriteString("\n#### 💡 AI 赋能作战推进建议：\n")
		answer.WriteString("- **攻坚重点**：建议总监本周组织对推进至「方案呈现」与「商务谈判」阶段的项目进行技术架构联合答辩。\n")
		answer.WriteString("- **赢单策略**：针对超百万级别商机，建议提供私有化部署保修期增值方案，以降低客户决策顾虑。\n")

	} else if strings.Contains(promptLower, "合同") || strings.Contains(promptLower, "审批") {
		actionType = "contract_audit"
		answer.WriteString("### 📑 领航 CRM · 合同履约与法务风控分析\n\n")
		answer.WriteString(fmt.Sprintf("系统已归档合同 **%d** 份，合同签约总额达 **¥%.2f**。\n\n", contractCount, totalContractAmount))
		if len(pendingContracts) > 0 {
			answer.WriteString(fmt.Sprintf("⚠️ **当前有 %d 份待审批签署合同需及时关注**：\n", len(pendingContracts)))
			for _, c := range pendingContracts {
				answer.WriteString(fmt.Sprintf("- 合同编号 `%s`: **%s**（%s）金额: `¥%.2f`\n", c.ContractNo, c.Title, c.CustomerName, c.Amount))
			}
			answer.WriteString("\n**合规建议**：请销售总监与合规法务人员尽快完成条款审核，防范履约滞后违约风险。\n")
		} else {
			answer.WriteString("✅ 目前所有签署合同均已完成终审或处于正常履约周期，无积压待审合同。\n")
		}

	} else if strings.Contains(promptLower, "海康") || strings.Contains(promptLower, "大华") || strings.Contains(promptLower, "方案") {
		actionType = "proposal_gen"
		answer.WriteString("### 🎯 重点客户跟进策略与商务方案建议\n\n")
		answer.WriteString("针对该重点企业客户，AI 建议采用**「技术底座 + 场景一体机 + 分期履约」**组合投标策略：\n\n")
		answer.WriteString("1. **客户核心痛点**：对算力延迟、本地数据资产合规性及信创适配要求极高。\n")
		answer.WriteString("2. **首选产品组合**：\n")
		answer.WriteString("   - `PRD-AI-01` 领航 AI 行业大模型私有化底座 (¥800,000)\n")
		answer.WriteString("   - `PRD-BOX-02` 边缘算力工控一体机 Pro (¥150,000/台)\n")
		answer.WriteString("3. **商务条款设计**：首付 50% 预付款，POC 阶段验收后付 30%，终验 20%，毛利率建议锁定在 40% 以上。\n")
		answer.WriteString("\n*已自动生成《企业级技术规格确认单草案》，可在附件库下载查看。*\n")

	} else {
		answer.WriteString(fmt.Sprintf("您好，**%s**！我是您的 **领航 CRM 销售 AI 助理**。\n\n", username))
		answer.WriteString(fmt.Sprintf("我已实时打通企业 CRM 核心数据库（当前掌握 **%d** 条活跃线索、**%d** 笔在推商机、**%d** 份企业合同）。\n\n", leadCount, dealCount, contractCount))
		answer.WriteString("您可以随时向我提问：\n")
		answer.WriteString("- 📌 *“帮我分析本月商机推进与业绩漏斗”*\n")
		answer.WriteString("- 📌 *“查询当前待审批签署的合同明细”*\n")
		answer.WriteString("- 📌 *“为海康威视 / 大华股份量身定制商务投标与跟进方案”*\n")
	}

	s.audit.Record(userID, username, roleName, "AI 智能体", "调用智能销售对话", "POST", "/api/v1/ai/chat", ip, fmt.Sprintf("AI 交互分析: %s (分类: %s)", prompt, actionType))

	return &AiChatResponse{
		Answer:     answer.String(),
		ActionType: actionType,
		DataSummary: map[string]interface{}{
			"dealsCount":     dealCount,
			"leadsCount":     leadCount,
			"contractsCount": contractCount,
			"dealVolume":     totalDealAmount,
		},
	}, nil
}
