package database

import (
	"fmt"
	"log"

	"crm-backend/config"
	"crm-backend/internal/model"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitMySQL(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBName,
	)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MySQL database: %w", err)
	}

	// Configure underlying connection pool
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	sqlDB.SetMaxOpenConns(cfg.DBMaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.DBMaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.DBConnMaxLifetime)

	log.Printf("[Database] MySQL connection pool initialized: MaxOpen=%d, MaxIdle=%d, Lifetime=%v",
		cfg.DBMaxOpenConns, cfg.DBMaxIdleConns, cfg.DBConnMaxLifetime)

	// Auto-migrate tables
	err = db.AutoMigrate(
		&model.SysRole{},
		&model.SysUser{},
		&model.SysUserRole{},
		&model.SysMenu{},
		&model.SysRolePermission{},
		&model.CrmLead{},
		&model.CrmDeal{},
		&model.CrmCustomer{},
		&model.CrmContract{},
		&model.CrmPayment{},
		&model.CrmProduct{},
		&model.SysOperationLog{},
	)
	if err != nil {
		return nil, fmt.Errorf("database auto-migration failed: %w", err)
	}

	DB = db
	return db, nil
}
