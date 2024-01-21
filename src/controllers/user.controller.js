const freelancerModel = require("../models/freelancer.model");
const employerModel = require("../models/employer.model");
const supplierModel = require("../models/Supplier.model");
const {ObjectId} = require("mongodb");
class UserController {
  static async searchUsersByRolesRequest(req, res) {
    try {
      const users = await UserController.searchUsersByRoles(req.body)
      res.status(200).json({ data: users});
    } catch (err) {
      res.status(err.code??500).json({ message: err.message });
    }
  }

  static async searchUsersByRoles(data) {
    const contractorIds = data.contractor??[];
    const clientIds = data.client??[];
    const supplierIds = data.supplier??[];

    let contractors = [];
    let clients = [];
    let suppliers = [];

    if(contractorIds.length>0)
    contractors = await freelancerModel.find({ _id : { $in : contractorIds } });
    if(clientIds.length>0)
    clients = await employerModel.find({ _id : { $in : clientIds } });
    if(supplierIds.length>0)
    suppliers = await supplierModel.find({ _id : { $in : supplierIds } });

    return {contractor:contractors, client:clients, supplier:suppliers}
  }


  static async searchUserByEmailRequest(req, res) {
    try {
      const users = await UserController.searchUserByEmail(req.body);
      res.status(200).json({ data: users });
    } catch (err) {
      res.status(err.code??500).json({ message: err.message });
    }
  }

  /**
   *
   * @param data {role: "contractor", email:"email@.com"}
   * @returns {QueryWithHelpers<GetLeanResultType<InferSchemaType<module:mongoose.Schema<any, Model<EnforcedDocType, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, ApplySchemaOptions<ObtainDocumentType<any, EnforcedDocType, ResolveSchemaOptions<TSchemaOptions>>, ResolveSchemaOptions<TSchemaOptions>>, HydratedDocument<DocType, TVirtuals & TInstanceMethods>>>, InferSchemaType<module:mongoose.Schema<any, Model<EnforcedDocType, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, ApplySchemaOptions<ObtainDocumentType<any, EnforcedDocType, ResolveSchemaOptions<TSchemaOptions>>, ResolveSchemaOptions<TSchemaOptions>>, HydratedDocument<DocType, TVirtuals & TInstanceMethods>>>[], "find">, HydratedDocument<InferSchemaType<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, {timestamps: boolean}, {business_name: {type: StringConstructor, required: boolean}, country: {type: StringConstructor, required: boolean}, passwordChangedAt: DateConstructor, role: {ref: string, type: ObjectId, required: boolean}, business_ver_document: {type: StringConstructor, required: boolean}, profile_pic: {type: StringConstructor, required: boolean}, supplier_type: {ref: string, type: ObjectId, required: boolean}, passwordResetToken: StringConstructor, type_of_product: {type: StringConstructor, required: boolean}, password: {type: StringConstructor, required: boolean}, supplier_deals: [{ref: string, type: ObjectId, required: boolean}], business_tel: {type: StringConstructor, required: boolean}, business_email_address: {unique: boolean, type: StringConstructor, required: boolean}, TIN: {type: StringConstructor, required: boolean}, about_business: {type: StringConstructor, required: boolean}, passwordResetTokenExpires: DateConstructor}, HydratedDocument<{business_name: {type: StringConstructor, required: boolean}, country: {type: StringConstructor, required: boolean}, passwordChangedAt: DateConstructor, role: {ref: string, type: ObjectId, required: boolean}, business_ver_document: {type: StringConstructor, required: boolean}, profile_pic: {type: StringConstructor, required: boolean}, supplier_type: {ref: string, type: ObjectId, required: boolean}, passwordResetToken: StringConstructor, type_of_product: {type: StringConstructor, required: boolean}, password: {type: StringConstructor, required: boolean}, supplier_deals: [{ref: string, type: ObjectId, required: boolean}], business_tel: {type: StringConstructor, required: boolean}, business_email_address: {unique: boolean, type: StringConstructor, required: boolean}, TIN: {type: StringConstructor, required: boolean}, about_business: {type: StringConstructor, required: boolean}, passwordResetTokenExpires: DateConstructor}, {}>>>, ObtainSchemaGeneric<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, {timestamps: boolean}, {business_name: {type: StringConstructor, required: boolean}, country: {type: StringConstructor, required: boolean}, passwordChangedAt: DateConstructor, role: {ref: string, type: ObjectId, required: boolean}, business_ver_document: {type: StringConstructor, required: boolean}, profile_pic: {type: StringConstructor, required: boolean}, supplier_type: {ref: string, type: ObjectId, required: boolean}, passwordResetToken: StringConstructor, type_of_product: {type: StringConstructor, required: boolean}, password: {type: StringConstructor, required: boolean}, supplier_deals: [{ref: string, type: ObjectId, required: boolean}], business_tel: {type: StringConstructor, required: boolean}, business_email_address: {unique: boolean, type: StringConstructor, required: boolean}, TIN: {type: StringConstructor, required: boolean}, about_business: {type: StringConstructor, required: boolean}, passwordResetTokenExpires: DateConstructor}, HydratedDocument<{business_name: {type: StringConstructor, required: boolean}, country: {type: StringConstructor, required: boolean}, passwordChangedAt: DateConstructor, role: {ref: string, type: ObjectId, required: boolean}, business_ver_document: {type: StringConstructor, required: boolean}, profile_pic: {type: StringConstructor, required: boolean}, supplier_type: {ref: string, type: ObjectId, required: boolean}, passwordResetToken: StringConstructor, type_of_product: {type: StringConstructor, required: boolean}, password: {type: StringConstructor, required: boolean}, supplier_deals: [{ref: string, type: ObjectId, required: boolean}], business_tel: {type: StringConstructor, required: boolean}, business_email_address: {unique: boolean, type: StringConstructor, required: boolean}, TIN: {type: StringConstructor, required: boolean}, about_business: {type: StringConstructor, required: boolean}, passwordResetTokenExpires: DateConstructor}, {}>>, "TVirtuals"> & ObtainSchemaGeneric<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, {timestamps: boolean}, {business_name: {type: StringConstructor, required: boolean}, country: {type: StringConstructor, required: boolean}, passwordChangedAt: DateConstructor, role: {ref: string, type: ObjectId, required: boolean}, business_ver_document: {type: StringConstructor, required: boolean}, profile_pic: {type: StringConstructor, required: boolean}, supplier_type: {ref: string, type: ObjectId, required: boolean}, passwordResetToken: StringConstructor, type_of_product: {type: StringConstructor, required: boolean}, password: {type: StringConstructor, required: boolean}, supplier_deals: [{ref: string, type: ObjectId, required: boolean}], business_tel: {type: StringConstructor, required: boolean}, business_email_address: {unique: boolean, type: StringConstructor, required: boolean}, TIN: {type: StringConstructor, required: boolean}, about_business: {type: StringConstructor, required: boolean}, passwordResetTokenExpires: DateConstructor}, HydratedDocument<{business_name: {type: StringConstructor, required: boolean}, country: {type: StringConstructor, required: boolean}, passwordChangedAt: DateConstructor, role: {ref: string, type: ObjectId, required: boolean}, business_ver_document: {type: StringConstructor, required: boolean}, profile_pic: {type: StringConstructor, required: boolean}, supplier_type: {ref: string, type: ObjectId, required: boolean}, passwordResetToken: StringConstructor, type_of_product: {type: StringConstructor, required: boolean}, password: {type: StringConstructor, required: boolean}, supplier_deals: [{ref: string, type: ObjectId, required: boolean}], business_tel: {type: StringConstructor, required: boolean}, business_email_address: {unique: boolean, type: StringConstructor, required: boolean}, TIN: {type: StringConstructor, required: boolean}, about_business: {type: StringConstructor, required: boolean}, passwordResetTokenExpires: DateConstructor}, {}>>, "TInstanceMethods">, ObtainSchemaGeneric<module:mongoose.Schema<any, Model<any, any, any, any>, {}, {}, {}, {}, {timestamps: boolean}, {business_name: {type: StringConstructor, required: boolean}, country: {type: StringConstructor, required: boolean}, passwordChangedAt: DateConstructor, role: {ref: string, type: ObjectId, required: boolean}, business_ver_document: {type: StringConstructor, required: boolean}, profile_pic: {type: StringConstructor, required: boolean}, supplier_type: {ref: string, type: ObjectId, required: boolean}, passwordResetToken: StringConstructor, type_of_product: {type: StringConstructor, required: boolean}, password: {type: StringConstructor, required: boolean}, supplier_deals: [{ref: string, type: ObjectId, required: boolean}], business_tel: {type: StringConstructor, required: boolean}, business_email_address: {unique: boolean, type: StringConstructor, required: boolean}, TIN: {type: StringConstructor, required: boolean}, about_business: {type: StringConstructor, required: boolean}, passwordResetTokenExpires: DateConstructor}, HydratedDocument<{business_name: {type: StringConstructor, required: boolean}, country: {type: StringConstructor, required: boolean}, passwordChangedAt: DateConstructor, role: {ref: string, type: ObjectId, required: boolean}, business_ver_document: {type: StringConstructor, required: boolean}, profile_pic: {type: StringConstructor, required: boolean}, supplier_type: {ref: string, type: ObjectId, required: boolean}, passwordResetToken: StringConstructor, type_of_product: {type: StringConstructor, required: boolean}, password: {type: StringConstructor, required: boolean}, supplier_deals: [{ref: string, type: ObjectId, required: boolean}], business_tel: {type: StringConstructor, required: boolean}, business_email_address: {unique: boolean, type: StringConstructor, required: boolean}, TIN: {type: StringConstructor, required: boolean}, about_business: {type: StringConstructor, required: boolean}, passwordResetTokenExpires: DateConstructor}, {}>>, "TQueryHelpers">>, ObtainSchemaGeneric<module:mongoose.Schema<any, Model<EnforcedDocType, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, ApplySchemaOptions<ObtainDocumentType<any, EnforcedDocType, ResolveSchemaOptions<TSchemaOptions>>, ResolveSchemaOptions<TSchemaOptions>>, HydratedDocument<DocType, TVirtuals & TInstanceMethods>>, "TQueryHelpers">, InferSchemaType<module:mongoose.Schema<any, Model<EnforcedDocType, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, ApplySchemaOptions<ObtainDocumentType<any, EnforcedDocType, ResolveSchemaOptions<TSchemaOptions>>, ResolveSchemaOptions<TSchemaOptions>>, HydratedDocument<DocType, TVirtuals & TInstanceMethods>>>, "find">}
   */
  static searchUserByEmail(data) {
      if(!(data.hasOwnProperty("role") && data.hasOwnProperty("email"))){
        let error = new Error("Bad request. role and email are required!")
        error.code = 400;
        throw error;
      }
      const role = data.role;
      const emailSearchKey = new RegExp("^"+data.email, "i");
      const userModel = role==="contractor"?
          {model:freelancerModel, searchKey:{email: emailSearchKey}}:
          role==="client"?
          {model:employerModel, searchKey:{email_address: emailSearchKey}}:
          {model:supplierModel, searchKey:{business_email_address: emailSearchKey}};

      return userModel.model.find(userModel.searchKey);
  }
}
module.exports = UserController;
